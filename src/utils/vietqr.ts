export interface BankOption {
  code: string; // VietQR code e.g. MB, VCB, BIDV
  name: string;
  bin: string;
}

export const POPULAR_BANKS: BankOption[] = [
  { code: 'MB', name: 'MBBank - Ngân hàng Quân Đội', bin: '970422' },
  { code: 'VCB', name: 'Vietcombank - Ngân hàng Ngoại Thương', bin: '970436' },
  { code: 'BIDV', name: 'BIDV - Ngân hàng Đầu tư & Phát triển', bin: '970418' },
  { code: 'ICB', name: 'VietinBank - Ngân hàng Công Thương', bin: '970415' },
  { code: 'TCB', name: 'Techcombank - Ngân hàng Kỹ Thương', bin: '970407' },
  { code: 'ACB', name: 'ACB - Ngân hàng Á Châu', bin: '970416' },
  { code: 'VPB', name: 'VPBank - Ngân hàng Việt Nam Thịnh Vượng', bin: '970432' },
  { code: 'AGR', name: 'Agribank - Ngân hàng Nông Nghiệp', bin: '970405' },
];

export function getVietQRUrl(
  bankCode: string,
  accountNo: string,
  amount: number,
  description: string,
  accountName: string
): string {
  const cleanAccountNo = accountNo.trim().replace(/\s+/g, '');
  const cleanAmount = Math.max(0, Math.round(amount));
  const desc = encodeURIComponent(description.slice(0, 50));
  const name = encodeURIComponent(accountName.trim());

  // Using VietQR Quick Link template
  return `https://img.vietqr.io/image/${bankCode}-${cleanAccountNo}-compact2.png?amount=${cleanAmount}&addInfo=${desc}&accountName=${name}`;
}
