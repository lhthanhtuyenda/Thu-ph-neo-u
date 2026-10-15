import * as XLSX from 'xlsx';
import { ReceiptRecord, PortConfig } from '../types';
import { formatDateVN } from './dateHelpers';

export function exportReceiptsToExcel(receipts: ReceiptRecord[], config: PortConfig, title = 'Bao_Cao_Thu_Phi_Neo_Dau_Sa_Lan') {
  const data = receipts.map((r, index) => ({
    'STT': index + 1,
    'Mã Biên Lai': r.id,
    'Ngày Cập Bến': formatDateVN(r.date),
    'Ngày Thu': r.collectedDate ? formatDateVN(r.collectedDate) : (r.paymentStatus === 'paid' ? formatDateVN(r.date) : 'Chưa thu'),
    'Biển Số Sà Lan': r.vehiclePlate,
    'Chủ Tàu / Thuyền Trưởng': r.ownerCaptain,
    'Trọng Tải (DWT - Tấn)': r.dwt,
    'Tên Hàng Hóa': r.cargoType,
    'Số Thu (VNĐ)': r.totalAmount > 0 ? r.totalAmount : 0,
    'Trạng Thái': r.paymentStatus === 'paid' ? 'Đã thu phí' : 'Chưa thu',
    'Hình Thức TT': r.paymentStatus === 'paid' ? r.paymentMethod : '',
    'Người Thu': r.collectorName || '',
    'Ghi Chú': r.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = [
    { wch: 6 },  // STT
    { wch: 18 }, // Mã Biên Lai
    { wch: 14 }, // Ngày Cập Bến
    { wch: 14 }, // Ngày Thu
    { wch: 16 }, // Biển Số Sà Lan
    { wch: 25 }, // Chủ Tàu
    { wch: 20 }, // Trọng Tải
    { wch: 20 }, // Hàng Hóa
    { wch: 18 }, // Số Thu
    { wch: 16 }, // Trạng Thái
    { wch: 30 }, // Hình Thức TT
    { wch: 16 }, // Người Thu
    { wch: 20 }, // Ghi Chú
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Thu Phí Neo Đậu');

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `${title}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

export function copyToClipboardTSV(receipts: ReceiptRecord[]): boolean {
  if (!receipts.length) return false;

  const headers = [
    'Mã Biên Lai',
    'Ngày Thu',
    'Biển Số',
    'Chủ Phương Tiện',
    'Trọng Tải (DWT)',
    'Tên Hàng Hóa',
    'Số Thu (đ)',
    'Hình Thức TT',
    'Người Thu',
  ];

  const rows = receipts.map((r) => [
    r.id,
    formatDateVN(r.collectedDate || r.date),
    r.vehiclePlate,
    r.ownerCaptain,
    r.dwt,
    r.cargoType,
    r.totalAmount,
    r.paymentMethod,
    r.collectorName,
  ]);

  const tsvContent = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
  navigator.clipboard.writeText(tsvContent);
  return true;
}

// Hàm chuẩn hóa chuỗi ngày Excel sang YYYY-MM-DD
// Hỗ trợ định dạng DD/MM/YYYY theo đúng yêu cầu người dùng
export function parseExcelDate(val: any, fallbackToToday = true): string | undefined {
  if (val === null || val === undefined || val === '') {
    return fallbackToToday ? new Date().toISOString().slice(0, 10) : undefined;
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      return fallbackToToday ? new Date().toISOString().slice(0, 10) : undefined;
    }
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof val === 'number') {
    // Excel date serial number (days since 1899-12-30)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return fallbackToToday ? new Date().toISOString().slice(0, 10) : undefined;

    // 1. DD/MM/YYYY hoặc D/M/YYYY hoặc DD-MM-YYYY (ưu tiên cao nhất theo chuẩn Việt Nam)
    const dmY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmY) {
      const day = dmY[1].padStart(2, '0');
      const month = dmY[2].padStart(2, '0');
      const year = dmY[3];
      return `${year}-${month}-${day}`;
    }

    // 2. YYYY-MM-DD hoặc YYYY/MM/DD
    const yMd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yMd) {
      const year = yMd[1];
      const month = yMd[2].padStart(2, '0');
      const day = yMd[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Thử new Date(s)
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return fallbackToToday ? new Date().toISOString().slice(0, 10) : undefined;
}

// Chuẩn hóa số
function parseCleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Tải file Excel mẫu để nhập dữ liệu
// Có đầy đủ cột NGÀY CẬP BẾN và NGÀY THU theo định dạng DD/MM/YYYY
export function downloadExcelTemplate() {
  const todayVN = formatDateVN(new Date());
  const sampleData = [
    {
      'Biển Số Sà Lan': 'TG 13939',
      'Chủ Tàu / Thuyền Trưởng': 'Nguyễn Văn Nam',
      'Trọng Tải (DWT - Tấn)': 1250,
      'Tên Hàng Hóa': 'Cát san lấp',
      'Ngày Cập Bến': todayVN,
      'Ngày Thu': todayVN,
      'Số Thu (VNĐ)': 400000,
      'Người Thu': 'Võ Thanh Tuấn',
      'Hình Thức TT': 'TIỀN MẶT',
      'Ghi Chú': 'Sà lan cập cầu 1',
    },
    {
      'Biển Số Sà Lan': 'ĐT 27333',
      'Chủ Tàu / Thuyền Trưởng': 'Trần Văn Bình',
      'Trọng Tải (DWT - Tấn)': 850,
      'Tên Hàng Hóa': 'Đá 1x2',
      'Ngày Cập Bến': todayVN,
      'Ngày Thu': todayVN,
      'Số Thu (VNĐ)': 200000,
      'Người Thu': 'Nguyễn Duy Thanh',
      'Hình Thức TT': 'TIỀN MẶT - XUẤT HÓA ĐƠN',
      'Ghi Chú': 'Yêu cầu xuất HĐ công ty',
    },
    {
      'Biển Số Sà Lan': 'SG 8899',
      'Chủ Tàu / Thuyền Trưởng': 'Lê Hoàng Long',
      'Trọng Tải (DWT - Tấn)': 2100,
      'Tên Hàng Hóa': 'Xi măng bao',
      'Ngày Cập Bến': todayVN,
      'Ngày Thu': '', // Chưa thu phí -> để trống
      'Số Thu (VNĐ)': 0,
      'Người Thu': '',
      'Hình Thức TT': '',
      'Ghi Chú': 'Chưa thu phí',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 18 }, // Biển Số Sà Lan
    { wch: 25 }, // Chủ Tàu / Thuyền Trưởng
    { wch: 22 }, // Trọng Tải (DWT - Tấn)
    { wch: 20 }, // Tên Hàng Hóa
    { wch: 18 }, // Ngày Cập Bến (DD/MM/YYYY)
    { wch: 18 }, // Ngày Thu (DD/MM/YYYY)
    { wch: 18 }, // Số Thu (VNĐ)
    { wch: 18 }, // Người Thu
    { wch: 30 }, // Hình Thức TT
    { wch: 25 }, // Ghi Chú
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Lieu');
  XLSX.writeFile(wb, 'Mau_Danh_Sach_Sa_Lan_Cang_Thanh_Phuoc.xlsx');
}

// Đọc và phân tích file Excel (XLSX, XLS, CSV) thành danh sách ReceiptRecord
export async function parseExcelFile(file: File): Promise<{
  success: boolean;
  data: ReceiptRecord[];
  totalRows: number;
  message?: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          resolve({ success: false, data: [], totalRows: 0, message: 'Không thể đọc nội dung file!' });
          return;
        }

        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          resolve({ success: false, data: [], totalRows: 0, message: 'File Excel không có sheet dữ liệu nào!' });
          return;
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        // Đọc raw data dưới dạng mảng 2 chiều
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

        if (!rawRows || rawRows.length === 0) {
          resolve({ success: false, data: [], totalRows: 0, message: 'Sheet dữ liệu đang trống!' });
          return;
        }

        // Tìm dòng tiêu đề (Header row) trong 10 dòng đầu
        let headerRowIdx = -1;
        const keyWords = ['biển số', 'phương tiện', 'sà lan', 'chủ tàu', 'thuyền trưởng', 'trọng tải', 'dwt', 'hàng hóa', 'stt'];

        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const rowStr = rawRows[i].map((cell) => String(cell || '').toLowerCase()).join(' ');
          const matchCount = keyWords.filter((kw) => rowStr.includes(kw)).length;
          if (matchCount >= 2) {
            headerRowIdx = i;
            break;
          }
        }

        // Nếu không tìm thấy bằng từ khóa kết hợp, thử tìm dòng có chữ "biển" hoặc "phương tiện"
        if (headerRowIdx === -1) {
          for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const rowStr = rawRows[i].map((cell) => String(cell || '').toLowerCase()).join(' ');
            if (rowStr.includes('biển') || rowStr.includes('phương tiện') || rowStr.includes('sà lan')) {
              headerRowIdx = i;
              break;
            }
          }
        }

        // Nếu vẫn không tìm thấy, mặc định lấy dòng 0 làm header
        if (headerRowIdx === -1) {
          headerRowIdx = 0;
        }

        const headerRow = rawRows[headerRowIdx].map((h) => String(h || '').trim());
        const dataRows = rawRows.slice(headerRowIdx + 1);

        // Ánh xạ vị trí các cột
        const colMap: { [key: string]: number } = {};
        headerRow.forEach((colName, idx) => {
          const lower = colName.toLowerCase();
          if (lower.includes('mã biên lai') || lower.includes('mã phiếu') || lower === 'id') {
            colMap['id'] = idx;
          } else if (lower.includes('biển số') || lower.includes('phương tiện') || lower.includes('sà lan') || lower.includes('số hiệu')) {
            colMap['vehiclePlate'] = idx;
          } else if (lower.includes('chủ tàu') || lower.includes('thuyền trưởng') || lower.includes('chủ phương tiện') || lower.includes('chủ hàng')) {
            colMap['ownerCaptain'] = idx;
          } else if (lower.includes('trọng tải') || lower.includes('dwt') || lower.includes('tấn') || lower.includes('tải trọng')) {
            colMap['dwt'] = idx;
          } else if (lower.includes('hàng hóa') || lower.includes('mặt hàng') || lower.includes('tên hàng')) {
            colMap['cargoType'] = idx;
          } else if (
            lower.includes('ngày thu') ||
            lower.includes('ngay thu') ||
            (lower.includes('thu') && lower.includes('ngày')) ||
            lower.includes('thời gian thu') ||
            lower.includes('ngày nộp') ||
            lower.includes('ngày đóng') ||
            lower.includes('ngày thanh toán')
          ) {
            colMap['collectedDate'] = idx;
          } else if (
            lower.includes('ngày cập') ||
            lower.includes('ngay cap') ||
            lower.includes('cập bến') ||
            lower.includes('ngày đến') ||
            lower.includes('ngay den') ||
            lower.includes('thời gian cập') ||
            lower.includes('ngày vào') ||
            lower === 'ngày' ||
            lower === 'ngay' ||
            lower.includes('ngày')
          ) {
            colMap['date'] = idx;
          } else if (lower.includes('số thu') || lower.includes('số tiền') || lower.includes('tiền thu') || lower.includes('thành tiền') || lower.includes('tổng tiền')) {
            colMap['totalAmount'] = idx;
          } else if (lower.includes('người thu') || lower.includes('nhân viên') || lower.includes('người lập')) {
            colMap['collectorName'] = idx;
          } else if (lower.includes('hình thức') || lower.includes('phương thức') || lower.includes('thanh toán')) {
            colMap['paymentMethod'] = idx;
          } else if (lower.includes('trạng thái')) {
            colMap['paymentStatus'] = idx;
          } else if (lower.includes('ghi chú')) {
            colMap['notes'] = idx;
          }
        });

        // Kiểm tra xem có cột Biển số sà lan không
        if (colMap['vehiclePlate'] === undefined) {
          // Thử tìm cột nào có giá trị giống biển số sà lan
          const colIdx = headerRow.findIndex((_, i) => i === 0 || i === 1 || i === 2);
          if (colIdx !== -1) {
            colMap['vehiclePlate'] = colIdx;
          }
        }

        const now = new Date();
        const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
        const parsedRecords: ReceiptRecord[] = [];

        dataRows.forEach((row, rowIdx) => {
          if (!row || row.length === 0) return;

          // Lấy biển số sà lan
          const plateVal = colMap['vehiclePlate'] !== undefined ? String(row[colMap['vehiclePlate']] || '').trim() : '';
          if (!plateVal || plateVal === 'undefined' || plateVal === 'null') {
            return; // Bỏ qua dòng trống
          }

          const vehiclePlate = plateVal.toUpperCase();
          const ownerCaptain = colMap['ownerCaptain'] !== undefined ? String(row[colMap['ownerCaptain']] || '').trim() : 'Chủ sà lan';
          const dwt = colMap['dwt'] !== undefined ? parseCleanNumber(row[colMap['dwt']]) : 0;
          const cargoType = colMap['cargoType'] !== undefined ? String(row[colMap['cargoType']] || '').trim() : 'Hàng bách hóa';
          
          // Ghi nhận ngày cập bến chính xác (hỗ trợ định dạng DD/MM/YYYY)
          const date = colMap['date'] !== undefined 
            ? (parseExcelDate(row[colMap['date']], true) || now.toISOString().slice(0, 10))
            : now.toISOString().slice(0, 10);
            
          // Ghi nhận ngày thu chính xác (hỗ trợ định dạng DD/MM/YYYY)
          const rawCollectedDate = colMap['collectedDate'] !== undefined 
            ? parseExcelDate(row[colMap['collectedDate']], false)
            : undefined;

          const totalAmount = colMap['totalAmount'] !== undefined ? parseCleanNumber(row[colMap['totalAmount']]) : 0;
          const collectorName = colMap['collectorName'] !== undefined ? String(row[colMap['collectorName']] || '').trim() : '';
          const notes = colMap['notes'] !== undefined ? String(row[colMap['notes']] || '').trim() : '';

          // Xác định hình thức thanh toán
          let rawMethod = colMap['paymentMethod'] !== undefined ? String(row[colMap['paymentMethod']] || '').trim() : '';
          let paymentMethod: any = 'TIỀN MẶT';
          if (rawMethod) {
            const mUpper = rawMethod.toUpperCase();
            if (mUpper.includes('CHUYỂN KHOẢN') || mUpper.includes('CK')) {
              paymentMethod = 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN';
            } else if (mUpper.includes('HÓA ĐƠN') || mUpper.includes('HĐ')) {
              paymentMethod = 'TIỀN MẶT - XUẤT HÓA ĐƠN';
            } else {
              paymentMethod = 'TIỀN MẶT';
            }
          }

          // Xác định trạng thái đã thu phí hay chưa
          let isPaid = false;
          if (totalAmount > 0 || !!rawCollectedDate) {
            isPaid = true;
          }
          if (colMap['paymentStatus'] !== undefined) {
            const stat = String(row[colMap['paymentStatus']] || '').toLowerCase();
            if (stat.includes('đã') || stat.includes('paid') || stat.includes('rồi')) {
              isPaid = true;
            } else if (stat.includes('chưa') || stat.includes('pending') || stat.includes('chưa thu')) {
              isPaid = false;
            }
          }

          // Ngày thu: nếu có ghi nhận ngày thu thì lấy ngày đó, nếu thu rồi mà chưa có ngày thu thì lấy ngày cập bến
          const finalCollectedDate = isPaid ? (rawCollectedDate || date) : undefined;

          // Mã định danh id ổn định (dựa trên Biển số và Ngày cập bến để chống cộng dồn / nhân đôi sà lan khi nạp lại file)
          const customId = colMap['id'] !== undefined ? String(row[colMap['id']] || '').trim() : '';
          const cleanPlate = vehiclePlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
          const cleanDate = date.replace(/[^0-9]/g, '');
          const stableId = cleanPlate ? `TP-${cleanDate}-${cleanPlate}` : `TP-${cleanDate}-${rowIdx + 1}`;
          const id = customId && customId.startsWith('TP-') ? customId : stableId;

          const record: ReceiptRecord = {
            id,
            date,
            collectedDate: finalCollectedDate,
            time: '08:00',
            vehiclePlate,
            ownerCaptain: ownerCaptain || 'Chủ phương tiện',
            dwt,
            cargoType: cargoType || 'Hàng tổng hợp',
            collectorName: collectorName || (isPaid ? 'Nhân viên điều độ' : ''),
            totalAmount,
            paymentMethod,
            paymentStatus: isPaid ? 'paid' : 'pending',
            berthStatus: 'docked',
            notes,
            createdAt: new Date().toISOString(),
          };

          parsedRecords.push(record);
        });

        if (parsedRecords.length === 0) {
          resolve({
            success: false,
            data: [],
            totalRows: dataRows.length,
            message: 'Không tìm thấy dòng sà lan hợp lệ nào trong file (cần có cột Biển số sà lan)!',
          });
          return;
        }

        resolve({
          success: true,
          data: parsedRecords,
          totalRows: parsedRecords.length,
        });
      } catch (err: any) {
        resolve({
          success: false,
          data: [],
          totalRows: 0,
          message: `Lỗi khi đọc file Excel: ${err?.message || 'Định dạng file không được hỗ trợ'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, data: [], totalRows: 0, message: 'Đã xảy ra lỗi khi tải file lên!' });
    };

    reader.readAsArrayBuffer(file);
  });
}
