import { Staff } from '../types';

/**
 * Trích xuất Tên (từ cuối cùng) từ Họ và Tên.
 * Vd: "Võ Thanh Tuấn" -> "Tuấn"
 *     "Nguyễn Trần Quang Khải" -> "Khải"
 *     "Nguyễn Duy Thanh" -> "Thanh"
 *     "Hà Minh Tâm" -> "Tâm"
 *     "Trần Ngọc Tân" -> "Tân"
 * Nếu đã là tên ngắn (vd: "Tuấn") thì giữ nguyên "Tuấn".
 */
export function getShortStaffName(fullNameOrName?: string): string {
  if (!fullNameOrName) return '';
  const trimmed = fullNameOrName.trim();
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1] || trimmed;
}

/**
 * Lấy Họ và Tên đầy đủ từ Tên hoặc từ Staff List.
 * Vd: Nếu truyền "Tuấn", tìm trong staffList ra "Võ Thanh Tuấn"
 * Nếu không tìm thấy trong staffList, so khớp với 5 nhân sự mặc định hoặc giữ nguyên.
 */
const DEFAULT_STAFF_MAP: Record<string, string> = {
  'Tuấn': 'Võ Thanh Tuấn',
  'Khải': 'Nguyễn Trần Quang Khải',
  'Thanh': 'Nguyễn Duy Thanh',
  'Tâm': 'Hà Minh Tâm',
  'Tân': 'Trần Ngọc Tân',
};

export function getFullStaffName(shortOrFullName: string | undefined, staffList?: Staff[]): string {
  if (!shortOrFullName) return '';
  const trimmed = shortOrFullName.trim();
  if (!trimmed) return '';

  // 1. Kiểm tra xem trimmed đã là họ tên đầy đủ (> 1 từ) hay chưa
  if (trimmed.includes(' ')) {
    return trimmed;
  }

  // 2. Tra cứu trong danh sách staff hiện hành
  if (staffList && staffList.length > 0) {
    const match = staffList.find(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase() ||
             getShortStaffName(s.name).toLowerCase() === trimmed.toLowerCase()
    );
    if (match && match.name.trim().includes(' ')) {
      return match.name.trim();
    }
  }

  // 3. Tra cứu trong danh mục 5 nhân sự mặc định
  if (DEFAULT_STAFF_MAP[trimmed]) {
    return DEFAULT_STAFF_MAP[trimmed];
  }

  return trimmed;
}
