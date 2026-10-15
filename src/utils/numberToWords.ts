// Vietnamese currency to words converter
const UNITS = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readGroupThree(group: string, showZeroHundred: boolean): string {
  const a = parseInt(group[0], 10);
  const b = parseInt(group[1], 10);
  const c = parseInt(group[2], 10);

  if (a === 0 && b === 0 && c === 0) return '';

  let res = '';

  if (a > 0 || showZeroHundred) {
    res += UNITS[a] + ' trăm ';
  }

  if (b === 0) {
    if (c > 0 && (a > 0 || showZeroHundred)) {
      res += 'lẻ ' + UNITS[c] + ' ';
    } else if (c > 0) {
      res += UNITS[c] + ' ';
    }
  } else if (b === 1) {
    res += 'mười ';
    if (c === 1) res += 'một ';
    else if (c === 5) res += 'lăm ';
    else if (c > 0) res += UNITS[c] + ' ';
  } else {
    res += UNITS[b] + ' mươi ';
    if (c === 1) res += 'mốt ';
    else if (c === 4) res += 'tư ';
    else if (c === 5) res += 'lăm ';
    else if (c > 0) res += UNITS[c] + ' ';
  }

  return res.trim();
}

export function numberToVietnameseWords(amount: number): string {
  if (!amount || amount === 0) return 'Không đồng';

  const s = Math.round(Math.abs(amount)).toString();
  const len = s.length;

  let padded = s;
  while (padded.length % 3 !== 0) {
    padded = '0' + padded;
  }

  const groups: string[] = [];
  for (let i = 0; i < padded.length; i += 3) {
    groups.push(padded.substring(i, i + 3));
  }

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const numGroups = groups.length;
  let result = '';

  for (let i = 0; i < numGroups; i++) {
    const groupStr = groups[i];
    const scaleIndex = numGroups - 1 - i;
    const isFirstGroup = i === 0 && len % 3 !== 0;
    const groupText = readGroupThree(groupStr, !isFirstGroup && i > 0);

    if (groupText) {
      result += groupText + ' ' + (scales[scaleIndex] ? scales[scaleIndex] + ' ' : '');
    }
  }

  result = result.trim();
  if (!result) return 'Không đồng';

  // Capitalize first letter and append "đồng chẵn"
  result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.';
  return result;
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0)) + ' đ';
}

export function formatNumberVN(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));
}

export function formatDWT(dwt: number): string {
  return new Intl.NumberFormat('vi-VN').format(dwt || 0) + ' tấn';
}
