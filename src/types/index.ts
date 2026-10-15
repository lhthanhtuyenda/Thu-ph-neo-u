export type PaymentMethod =
  | 'TIỀN MẶT'
  | 'TIỀN MẶT - XUẤT HÓA ĐƠN'
  | 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN';

export type BerthStatus = 'docked' | 'departed';
export type PaymentStatus = 'paid' | 'pending';
export type ShiftType = 'Ca 1 (06:00 - 14:00)' | 'Ca 2 (14:00 - 22:00)' | 'Ca 3 (22:00 - 06:00)';

export interface ReceiptRecord {
  id: string; // Mã biên lai, vd: TP-20261007-001
  date: string; // YYYY-MM-DD (Ngày cập bến)
  collectedDate?: string; // YYYY-MM-DD (Ngày thu phí)
  time?: string; // HH:mm
  vehiclePlate: string; // Biển số sà lan (vd: TG 13939, ĐT 27333...)
  ownerCaptain: string; // Chủ phương tiện / Thuyền trưởng
  dwt: number; // Trọng tải (DWT - tấn)
  cargoType: string; // Tên hàng hóa
  collectorName: string; // Người thu (Tuấn, Khải, Thanh...)
  totalAmount: number; // Số thu (200.000, 400.000, 600.000...)
  paymentMethod: PaymentMethod; // 'TIỀN MẶT' | 'TIỀN MẶT - XUẤT HÓA ĐƠN' | 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN'
  paymentStatus?: PaymentStatus;
  submitted?: boolean; // Đã nộp tiền quỹ chưa
  submittedAt?: string; // Thời gian nộp tiền
  berthStatus: BerthStatus; // Đang neo đậu / Đã rời bến
  shift?: ShiftType;
  notes?: string;
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  phone: string;
  shift: ShiftType;
  role: string;
  active: boolean;
  password?: string;
}

export interface UserAccount {
  id: string; // Unique username or staff ID, e.g. 'Admin', 'NV01', 'NV02'
  username: string; // Login ID, e.g. 'Admin', 'NV01'
  password: string; // Login password
  fullName: string; // Display name
  role: string; // 'Quản trị viên' | 'Nhân viên điều độ' | etc.
  staffId?: string; // If associated with a Staff record
  active: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface PortConfig {
  portName: string;
  companyName: string;
  subTitle: string;
  address: string;
  phone?: string;
  fax?: string;
  hotline: string;
  taxCode: string;
  denominations: number[]; // Mệnh giá số thu: [200000, 400000, 600000]
  signatories?: string[]; // Người ký biên bản: ['Võ Thanh Tuấn', 'Nguyễn Trần Quang Khải', 'Nguyễn Duy Thanh']
  googleSheetsWebhookUrl?: string;
}

export type ActiveTab = 'entry' | 'management' | 'reports' | 'personnel';
