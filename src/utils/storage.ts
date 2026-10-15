import { ReceiptRecord, Staff, PortConfig, ShiftType, UserAccount } from '../types';

const STORAGE_KEY_RECEIPTS = 'thanh_phuoc_barges_clean_v3';
const STORAGE_KEY_STAFF = 'thanh_phuoc_staff_v3';
const STORAGE_KEY_CONFIG = 'thanh_phuoc_config_v5';
const STORAGE_KEY_CUSTOM_BARGES = 'thanh_phuoc_barges_list_v3';
const STORAGE_KEY_CUSTOM_CARGOS = 'thanh_phuoc_cargos_list_v3';
const STORAGE_KEY_ACCOUNTS = 'thanh_phuoc_accounts_v2';
const STORAGE_KEY_CURRENT_USER = 'thanh_phuoc_current_user_v2';

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'Admin',
    username: 'Admin',
    password: 'Admin@789',
    fullName: 'Quản trị viên bến cảng',
    role: 'Quản trị viên',
    active: true,
    createdAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'NV01',
    username: 'NV01',
    password: '123456',
    fullName: 'Võ Thanh Tuấn',
    role: 'Nhân viên điều độ',
    staffId: 'NV01',
    active: true,
    createdAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'NV02',
    username: 'NV02',
    password: '123456',
    fullName: 'Nguyễn Trần Quang Khải',
    role: 'Nhân viên điều độ',
    staffId: 'NV02',
    active: true,
    createdAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'NV03',
    username: 'NV03',
    password: '123456',
    fullName: 'Nguyễn Duy Thanh',
    role: 'Nhân viên điều độ',
    staffId: 'NV03',
    active: true,
    createdAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'NV04',
    username: 'NV04',
    password: '123456',
    fullName: 'Hà Minh Tâm',
    role: 'Nhân viên điều độ',
    staffId: 'NV04',
    active: true,
    createdAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 'NV05',
    username: 'NV05',
    password: '123456',
    fullName: 'Trần Ngọc Tân',
    role: 'Nhân viên điều độ',
    staffId: 'NV05',
    active: true,
    createdAt: '2026-10-14T00:00:00.000Z',
  },
];

export const DEFAULT_CONFIG: PortConfig = {
  portName: 'CẢNG THẠNH PHƯỚC',
  companyName: 'CÔNG TY CỔ PHẦN CẢNG THẠNH PHƯỚC',
  subTitle: 'THU PHÍ NEO ĐẬU SÀ LAN',
  address: '207, KP Tân Lương, P.Tân Khánh, TP. Hồ Chí Minh',
  phone: '(0274) 3849999',
  fax: '(0274) 3629434',
  hotline: 'Điện thoại: (0274) 3849999 - Fax: (0274) 3629434',
  taxCode: '3700849845',
  denominations: [200000, 400000, 600000],
  signatories: [
    'Võ Thanh Tuấn',
    'Nguyễn Trần Quang Khải',
    'Nguyễn Duy Thanh',
    'Hà Minh Tâm',
    'Trần Ngọc Tân',
  ],
  googleSheetsWebhookUrl: '',
};

export const INITIAL_STAFF: Staff[] = [
  { id: 'NV01', name: 'Võ Thanh Tuấn', phone: '0912.345.678', shift: 'Ca 1 (06:00 - 14:00)', role: 'Nhân viên điều độ', active: true },
  { id: 'NV02', name: 'Nguyễn Trần Quang Khải', phone: '0988.765.432', shift: 'Ca 2 (14:00 - 22:00)', role: 'Nhân viên điều độ', active: true },
  { id: 'NV03', name: 'Nguyễn Duy Thanh', phone: '0903.112.233', shift: 'Ca 3 (22:00 - 06:00)', role: 'Nhân viên điều độ', active: true },
  { id: 'NV04', name: 'Hà Minh Tâm', phone: '0938.889.900', shift: 'Ca 1 (06:00 - 14:00)', role: 'Nhân viên điều độ', active: true },
  { id: 'NV05', name: 'Trần Ngọc Tân', phone: '0979.667.788', shift: 'Ca 2 (14:00 - 22:00)', role: 'Nhân viên điều độ', active: true },
];

// Raw barge list provided by the user
export const RAW_BARGE_PLATES = [
  'TG 13939',
  'ĐT 27333',
  'ĐN 1259',
  'ĐN 1288',
  'TG 15477',
  'CM 26171',
  'TG 19189',
  'BTr 8777',
  'TG 16779',
  'ĐT 19709',
  'LA 08468',
  'TG 15769',
  'TG 19297',
  'TG 9497',
  'AG 25404',
  'TN 0817',
  'QN 7940',
  'ĐN 1303',
  'TV 0809',
  'SG 3999',
  'SG 9883',
  'ĐT 25727',
  'TG 19199',
  'QN 8620',
  'TG 12437',
  'TG 14789',
  'ĐT 26484',
  'TG 17759',
  'TG 14569',
  'AG 13571',
  'ĐT 26284',
  'TG 14939',
  'TG 19009',
  'QN 8958',
  'SG 6254',
  'TG 19676',
  'ĐT 26969',
  'SG 6020',
  'ĐN 1231',
  'TG 19909',
  'VL 16307',
  'LA 07567',
  'AG 13743',
  'SG 9948',
  'SG 6323',
  'TG 15959',
  'SG 8272',
  'SG 9945',
  'TG 14040',
  'TG 19629',
  'TG 16579',
  'TG 14740',
  'SG 6293',
  'TG 15389',
  'ĐN 1007',
  'TG 17678',
  'SG 4780',
  'AG 26513',
  'SG 8105',
  'SG 9954',
  'SG 6030',
  'TG 15467',
  'SG 9950',
  'VL 15423',
  'LA 06864',
  'SG 5976',
  'SG 9953',
  'BTr 8575',
  'SG 8921',
  'TG 4939',
  'TG 19868',
  'SG 6239',
  'BD 0107',
  'SG 9952',
  'AG 19595',
  'ĐT 27275',
];

export const UNIQUE_BARGE_PLATES = Array.from(
  new Set(RAW_BARGE_PLATES.map((p) => p.trim().toUpperCase()))
);

export const INITIAL_CARGOS = [
  'Viên nén',
  'Phân đạm',
  'Than đá',
  'Sắt cây',
  'Đá',
  'Đá I&C',
  'Tôn cuộn',
  'Tôn',
  'Tôn đen',
  'Viên nén gỗ',
  'Tro bay',
  'Rác',
  'Mật đường',
  'Thạch Cao',
];

// Clean empty initial receipts list as requested: "danh sách bên dưới bỏ hết các dữ liệu đã có"
export const INITIAL_RECEIPTS: ReceiptRecord[] = [];

export function getStoredReceipts(): ReceiptRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECEIPTS);
    if (!raw) {
      return INITIAL_RECEIPTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECEIPTS;
  }
}

export function saveReceipts(receipts: ReceiptRecord[]): void {
  localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(receipts));
}

export function getStoredStaff(): Staff[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAFF);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(INITIAL_STAFF));
      return INITIAL_STAFF;
    }
    const parsed: Staff[] = JSON.parse(raw);
    // If stored staff has old 1-word dummy names (Tuấn, Khải, Thanh, Hoàng, Linh), migrate to user requested 5 full names
    const hasOldDefaultNames = parsed.some((s) => ['Tuấn', 'Khải', 'Thanh', 'Hoàng', 'Linh'].includes(s.name));
    if (hasOldDefaultNames) {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(INITIAL_STAFF));
      return INITIAL_STAFF;
    }
    // Auto update any old 'Thu ngân' to 'Nhân viên điều độ'
    const migrated = parsed.map((s) => ({
      ...s,
      role: s.role === 'Thu ngân' ? 'Nhân viên điều độ' : (s.role || 'Nhân viên điều độ'),
      active: s.active !== undefined ? s.active : true,
    }));
    return migrated;
  } catch {
    return INITIAL_STAFF;
  }
}

export function saveStaff(staff: Staff[]): void {
  localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(staff));
}

export function getStoredConfig(): PortConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(DEFAULT_CONFIG));
      return DEFAULT_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      // If address/taxCode is from the previous default, auto-update to the new exact info
      address: parsed.address && !parsed.address.includes('Tân Uyên')
        ? parsed.address
        : DEFAULT_CONFIG.address,
      taxCode: parsed.taxCode && parsed.taxCode !== '3701258673'
        ? parsed.taxCode
        : DEFAULT_CONFIG.taxCode,
      hotline: parsed.hotline && !parsed.hotline.includes('362 6768')
        ? parsed.hotline
        : DEFAULT_CONFIG.hotline,
      denominations: parsed.denominations && parsed.denominations.length > 0
        ? parsed.denominations
        : [200000, 400000, 600000],
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: PortConfig): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
}

export function getKnownBarges(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_BARGES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_BARGES, JSON.stringify(UNIQUE_BARGE_PLATES));
      return UNIQUE_BARGE_PLATES;
    }
    const list = JSON.parse(raw);
    return Array.from(new Set([...UNIQUE_BARGE_PLATES, ...list]));
  } catch {
    return UNIQUE_BARGE_PLATES;
  }
}

export function recordKnownBarge(plate: string): void {
  if (!plate || !plate.trim()) return;
  const clean = plate.trim().toUpperCase();
  const current = getKnownBarges();
  if (!current.includes(clean)) {
    const updated = [clean, ...current];
    localStorage.setItem(STORAGE_KEY_CUSTOM_BARGES, JSON.stringify(updated));
  }
}

export function getKnownCargos(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_CARGOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_CARGOS, JSON.stringify(INITIAL_CARGOS));
      return INITIAL_CARGOS;
    }
    const list = JSON.parse(raw);
    return Array.from(new Set([...INITIAL_CARGOS, ...list]));
  } catch {
    return INITIAL_CARGOS;
  }
}

export function recordKnownCargo(cargo: string): void {
  if (!cargo || !cargo.trim()) return;
  const clean = cargo.trim();
  const current = getKnownCargos();
  if (!current.some((c) => c.toLowerCase() === clean.toLowerCase())) {
    const updated = [clean, ...current];
    localStorage.setItem(STORAGE_KEY_CUSTOM_CARGOS, JSON.stringify(updated));
  }
}

export function generateReceiptId(dateStr: string, existingReceipts: ReceiptRecord[]): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const prefix = `TP-${cleanDate}-`;
  const countToday = existingReceipts.filter((r) => r.date === dateStr).length + 1;
  const seq = countToday.toString().padStart(3, '0');
  return `${prefix}${seq}`;
}

export function getCurrentShift(): ShiftType {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'Ca 1 (06:00 - 14:00)';
  if (hour >= 14 && hour < 22) return 'Ca 2 (14:00 - 22:00)';
  return 'Ca 3 (22:00 - 06:00)';
}

export function getStoredAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed: UserAccount[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    // Ensure Admin always exists
    const hasAdmin = parsed.some((a) => a.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
      const merged = [DEFAULT_ACCOUNTS[0], ...parsed];
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

export function saveAccounts(accounts: UserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.warn('Lỗi lưu accounts vào localStorage:', err);
  }
}

export function getStoredCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  } catch (err) {
    console.warn('Lỗi lưu currentUser vào localStorage:', err);
  }
}

