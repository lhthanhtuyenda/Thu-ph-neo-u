/**
 * Tiện ích chuẩn hóa và định dạng ngày tháng theo chuẩn Việt Nam (DD/MM/YYYY)
 * Áp dụng thống nhất cho toàn bộ hệ thống quản lý thu phí Cảng Thạnh Phước
 */

/**
 * Định dạng ngày theo chuẩn Việt Nam: DD/MM/YYYY
 * Xử lý chính xác tất cả các trường hợp:
 * - Chuỗi YYYY-MM-DD
 * - Chuỗi ISO timestamp (YYYY-MM-DDTHH:mm:ss...)
 * - Chuỗi YYYY/MM/DD
 * - Chuỗi DD/MM/YYYY (đã đúng chuẩn -> giữ nguyên)
 * - Đối tượng Date
 * - Timestamp dạng số (milliseconds)
 */
export function formatDateVN(dateInput?: string | Date | number | null): string {
  if (!dateInput) return '';

  // 1. Đối tượng Date
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 2. Timestamp số
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 3. Chuỗi ký tự
  const str = String(dateInput).trim();
  if (!str) return '';

  // Nếu đã ở dạng chuẩn DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Nếu ở dạng D/M/YYYY
  const shortSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (shortSlash) {
    const day = shortSlash[1].padStart(2, '0');
    const month = shortSlash[2].padStart(2, '0');
    const year = shortSlash[3];
    return `${day}/${month}/${year}`;
  }

  // Tách ngày nếu có chứa T hoặc khoảng trắng (ISO string hoặc YYYY-MM-DD HH:mm:ss)
  const onlyDate = str.includes('T') ? str.split('T')[0] : (str.includes(' ') ? str.split(' ')[0] : str);

  // YYYY-MM-DD hoặc YYYY/MM/DD
  const sep = onlyDate.includes('-') ? '-' : (onlyDate.includes('/') ? '/' : '');
  if (sep) {
    const parts = onlyDate.split(sep);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${day}/${month}/${year}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY hoặc MM-DD-YYYY (chuẩn Việt Nam phần đầu là ngày)
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${day}/${month}/${year}`;
      }
    }
  }

  // Thử parse Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Định dạng ngày giờ: DD/MM/YYYY HH:mm hoặc DD/MM/YYYY
 */
export function formatDateTimeVN(dateInput?: string | Date | number | null, timeInput?: string): string {
  const dateFormatted = formatDateVN(dateInput);
  if (!dateFormatted) return '';
  if (timeInput && timeInput.trim()) {
    return `${dateFormatted} ${timeInput.trim()}`;
  }
  return dateFormatted;
}

/**
 * Lấy chuỗi ngày hôm nay dạng YYYY-MM-DD (dùng cho HTML <input type="date">)
 */
export function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Lấy chuỗi ngày hôm nay dạng văn bản tiếng Việt chính thức: "Ngày DD tháng MM năm YYYY"
 */
export function getTodayVietnameseDate(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `Ngày ${day} tháng ${month} năm ${year}`;
}
