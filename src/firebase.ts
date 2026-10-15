import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocFromServer,
  getDocs,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { ReceiptRecord, Staff, PortConfig } from './types';

// Khởi tạo Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Khởi tạo Firestore với Database ID được cấp
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Khởi tạo Auth
export const auth = getAuth(app);

// Kiểm tra kết nối Firestore khi khởi động
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'port_config'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore đang ở chế độ ngoại tuyến hoặc chưa kết nối.');
      return false;
    }
    // Nếu kết nối tới server Google Cloud thành công
    return true;
  }
}

// Thông tin cấu hình đám mây để hiển thị cho người dùng
export const cloudInfo = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  authDomain: firebaseConfig.authDomain,
};

// ========================================================
// 1. ĐỒNG BỘ THỜI GIAN THỰC CHO PHIẾU SÀ LAN (RECEIPTS)
// ========================================================
// Hàm lọc trùng lặp sà lan theo Biển số và Ngày cập bến
export function deduplicateReceipts(records: ReceiptRecord[]): ReceiptRecord[] {
  const map = new Map<string, ReceiptRecord>();
  records.forEach((r) => {
    const plate = (r.vehiclePlate || '').trim().toUpperCase();
    const date = r.date || '';
    const key = `${plate}___${date}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
    } else {
      // Ưu tiên bản ghi đã thu phí hoặc có số tiền lớn hơn hoặc đã nộp
      const preferred = (r.paymentStatus === 'paid' && existing.paymentStatus !== 'paid')
        || (r.totalAmount > existing.totalAmount)
        || (r.submitted && !existing.submitted)
        ? r
        : existing;
      map.set(key, preferred);
    }
  });
  const deduped = Array.from(map.values());
  deduped.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return deduped;
}

export function subscribeToReceipts(
  callback: (receipts: ReceiptRecord[]) => void,
  onConnectionChange?: (connected: boolean) => void
): () => void {
  const receiptsCol = collection(db, 'receipts');
  return onSnapshot(
    receiptsCol,
    (snapshot) => {
      if (onConnectionChange) {
        onConnectionChange(true);
      }
      const records: ReceiptRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as ReceiptRecord);
      });
      // Tự động chống cộng dồn / trùng lặp dữ liệu
      const cleanRecords = deduplicateReceipts(records);
      callback(cleanRecords);
    },
    (err) => {
      console.error('Lỗi lắng nghe dữ liệu sà lan từ Firestore:', err);
      if (onConnectionChange) {
        onConnectionChange(false);
      }
    }
  );
}

// Hàm tải toàn bộ danh sách sà lan trực tiếp từ Firestore một lần
export async function fetchAllReceiptsFromFirestore(): Promise<ReceiptRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'receipts'));
    const records: ReceiptRecord[] = [];
    snap.forEach((docSnap) => {
      records.push(docSnap.data() as ReceiptRecord);
    });
    // Tự động chống cộng dồn / trùng lặp dữ liệu
    return deduplicateReceipts(records);
  } catch (err) {
    console.error('Lỗi tải sà lan từ Firestore:', err);
    throw err;
  }
}

export async function syncReceiptToFirestore(receipt: ReceiptRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'receipts', receipt.id), receipt, { merge: true });
  } catch (err) {
    console.error('Lỗi lưu sà lan lên Firestore:', err);
    throw err;
  }
}

export async function syncMultipleReceiptsToFirestore(receipts: ReceiptRecord[]): Promise<void> {
  try {
    // Firestore batch tối đa 500 documents mỗi lần
    const chunks: ReceiptRecord[][] = [];
    for (let i = 0; i < receipts.length; i += 400) {
      chunks.push(receipts.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const r of chunk) {
        batch.set(doc(db, 'receipts', r.id), r, { merge: true });
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Lỗi lưu nhiều sà lan lên Firestore:', err);
    throw err;
  }
}

export async function removeReceiptFromFirestore(receiptId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'receipts', receiptId));
  } catch (err) {
    console.error('Lỗi xóa sà lan trên Firestore:', err);
    throw err;
  }
}

// ========================================================
// 2. ĐỒNG BỘ CẤU HÌNH BẾN CẢNG (PORT CONFIG)
// ========================================================
export function subscribeToConfig(callback: (config: PortConfig) => void): () => void {
  const configDoc = doc(db, 'settings', 'port_config');
  return onSnapshot(
    configDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as PortConfig);
      }
    },
    (err) => {
      console.error('Lỗi lắng nghe cấu hình cảng từ Firestore:', err);
    }
  );
}

export async function syncConfigToFirestore(config: PortConfig): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'port_config'), config, { merge: true });
  } catch (err) {
    console.error('Lỗi lưu cấu hình cảng lên Firestore:', err);
  }
}

// ========================================================
// 3. ĐỒNG BỘ DANH SÁCH NHÂN SỰ (STAFF)
// ========================================================
export function subscribeToStaff(callback: (staff: Staff[]) => void): () => void {
  const staffCol = collection(db, 'staff');
  return onSnapshot(
    staffCol,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: Staff[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Staff);
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        callback(list);
      }
    },
    (err) => {
      console.error('Lỗi lắng nghe nhân sự từ Firestore:', err);
    }
  );
}

export async function syncStaffListToFirestore(staffList: Staff[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const s of staffList) {
      batch.set(doc(db, 'staff', s.id), s, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.error('Lỗi lưu nhân sự lên Firestore:', err);
  }
}
