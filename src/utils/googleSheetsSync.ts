import { ReceiptRecord, PortConfig } from '../types';
import { getFullStaffName } from './staffHelpers';
import { formatNumberVN } from './numberToWords';

export interface SheetRowPayload {
  sheetId: string;
  gid: string;
  startRow: number;
  startCol: string; // 'B'
  action: 'append_from_row';
  record: {
    collectedDate: string; // Cột B: Thời gian (thời gian thu phí)
    vehiclePlate: string;  // Cột C: Phương tiện
    ownerCaptain: string;  // Cột D: Chủ phương tiện / Thuyền trưởng
    dwt: number;           // Trọng tải (DWT)
    cargoType: string;     // Tên hàng hóa
    collectorName: string; // Người thu
    totalAmount: number;   // Số thu
    notes: string;         // Ghi chú (TM / TM-HĐ / CK-HĐ)
  };
}

/**
 * Format ghi chú ngắn theo yêu cầu: (TM / TM-HĐ / CK-HĐ)
 */
export function formatPaymentMethodNote(method?: string): string {
  if (!method) return 'TM';
  const upper = method.toUpperCase().trim();
  if (upper.includes('CHUYỂN KHOẢN') || upper.includes('CK')) {
    return 'CK-HĐ';
  }
  if (upper.includes('XUẤT HÓA ĐƠN') || upper.includes('HÓA ĐƠN') || upper.includes('HĐ')) {
    return 'TM-HĐ';
  }
  return 'TM';
}

/**
 * Định dạng ngày giờ VN DD/MM/YYYY
 */
export function formatCollectedTimeVN(dateStr?: string, timeStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const parts = dateStr.split('-');
  let dateFormatted = dateStr;
  if (parts.length === 3) {
    dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  if (timeStr) {
    return `${dateFormatted} ${timeStr}`;
  }
  return dateFormatted;
}

/**
 * Gửi dữ liệu thu phí sà lan tự động sang Google Sheet khi bấm nút [THU PHÍ]
 * Ghi từ dòng B9 trở đi:
 * Cột B: Thời gian thu phí
 * Cột C: Phương tiện (biển số)
 * Cột D: Chủ phương tiện / thuyền trưởng
 * Cột E: Tên hàng hóa
 * Cột F: Người thu (Họ và tên hoặc Tên)
 * Cột G: Số thu
 * Cột H: Ghi chú (TM / TM-HĐ / CK-HĐ)
 */
export async function syncFeeToGoogleSheet(
  receipt: ReceiptRecord,
  config: PortConfig
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = config.googleSheetsWebhookUrl?.trim();
  if (!webhookUrl) {
    return {
      success: false,
      message: 'Chưa cấu hình Google Apps Script Webhook URL để tự động ghi vào Sheet.',
    };
  }

  const payload: SheetRowPayload = {
    sheetId: '1vT_jIaX3b2rKHg0Ea0D2jiRhxCXd54XcW0iQDDCkcJU',
    gid: '1300378637',
    startRow: 9, // Bắt đầu từ dòng B9
    startCol: 'B',
    action: 'append_from_row',
    record: {
      collectedDate: formatCollectedTimeVN(receipt.collectedDate || receipt.date, receipt.time),
      vehiclePlate: receipt.vehiclePlate || '',
      ownerCaptain: receipt.ownerCaptain || '',
      dwt: receipt.dwt || 0,
      cargoType: receipt.cargoType || '',
      collectorName: receipt.collectorName || '',
      totalAmount: receipt.totalAmount || 0,
      notes: formatPaymentMethodNote(receipt.paymentMethod),
    },
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: 'Đã gửi thông tin thu phí sang Google Sheets (từ dòng B9)!',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Lỗi khi gửi sang Google Sheet: ' + (error as Error).message,
    };
  }
}
