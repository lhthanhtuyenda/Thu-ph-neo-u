import React, { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  Printer,
  Copy,
  TrendingUp,
  Banknote,
  CheckCircle,
  FileText,
  UserCheck,
  X,
  CreditCard,
  Check,
  Ship,
  Sparkles,
  ArrowRight,
  Eye,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ReceiptRecord, Staff, PortConfig } from '../types';
import { formatVND, formatNumberVN, numberToVietnameseWords } from '../utils/numberToWords';
import { exportReceiptsToExcel, copyToClipboardTSV } from '../utils/excel';
import { getFullStaffName, getShortStaffName } from '../utils/staffHelpers';
import { formatDateVN, getTodayVietnameseDate, getTodayDateStr } from '../utils/dateHelpers';

interface ReportsViewProps {
  receipts: ReceiptRecord[];
  staffList: Staff[];
  config: PortConfig;
  onOpenGoogleSheetsModal: () => void;
  onBulkSubmitReceipts: (receiptIds: string[], submittedDate?: string) => void;
  onUpdateConfig: (newConfig: PortConfig) => void;
}

// Map short collector name to full name for official document signature
const STAFF_FULL_NAMES: Record<string, string> = {
  Thanh: 'Nguyễn Duy Thanh',
  Tuấn: 'Võ Thanh Tuấn',
  Khải: 'Nguyễn Trần Quang Khải',
  Hoàng: 'Nguyễn Văn Hoàng',
  Linh: 'Trần Mỹ Linh',
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  receipts,
  staffList,
  config,
  onOpenGoogleSheetsModal,
  onBulkSubmitReceipts,
  onUpdateConfig,
}) => {
  const todayStr = getTodayDateStr();
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // View mode: 'unsubmitted' (chưa nộp tiền - mặc định) vs 'submitted' (đã nộp tiền) vs 'all'
  const [viewMode, setViewMode] = useState<'unsubmitted' | 'submitted' | 'all'>('unsubmitted');

  // Filters: Date range (Từ ngày đến ngày)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // 1. VẪN GIỮ BỘ LỌC THEO TÊN NGƯỜI THU
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  // Notifications
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // 4. Modal nộp tiền mặt state & danh sách chọn phiếu
  const [showNopTienModal, setShowNopTienModal] = useState<boolean>(false);
  const [modalSubmitterName, setModalSubmitterName] = useState<string>('Nguyễn Duy Thanh');
  const [selectedReceiptIdsToSubmit, setSelectedReceiptIdsToSubmit] = useState<string[]>([]);
  const [submissionDate, setSubmissionDate] = useState<string>(todayStr);

  // 2. MODAL XEM TRƯỚC BẢN IN BIÊN BẢN (HIỂN THỊ BẢN IN KHI BẤM NÚT IN)
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState<boolean>(false);

  // Signer / Submitter for print template
  const [printSignerName, setPrintSignerName] = useState<string>('Nguyễn Duy Thanh');

  // Danh sách những người ký biên bản / nộp tiền lấy từ danh sách nhân sự đang làm
  const activeSignerNames = useMemo(() => {
    const list = staffList
      .filter((s) => s.active !== false)
      .map((s) => getFullStaffName(s.name, staffList));
    if (list.length > 0) {
      return Array.from(new Set(list));
    }
    return config.signatories && config.signatories.length > 0
      ? config.signatories
      : [
          'Võ Thanh Tuấn',
          'Nguyễn Trần Quang Khải',
          'Nguyễn Duy Thanh',
          'Hà Minh Tâm',
          'Trần Ngọc Tân',
        ];
  }, [staffList, config.signatories]);

  // Available collectors from receipts & active staff (Hiển thị HỌ VÀ TÊN cho phần Báo Cáo)
  const availableCollectors = useMemo(() => {
    const list: string[] = [];
    staffList
      .filter((s) => s.active !== false)
      .forEach((s) => {
        const full = getFullStaffName(s.name, staffList);
        if (!list.includes(full)) list.push(full);
      });
    return list;
  }, [staffList]);

  // Sync signer name when filter by collector changes
  const handleSelectStaff = (staffFullName: string) => {
    setSelectedStaff(staffFullName);
    if (staffFullName !== 'all') {
      setPrintSignerName(staffFullName);
      setModalSubmitterName(staffFullName);
    }
  };

  // Filtered dataset for BẢNG KÊ
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      // Chỉ lấy các sà lan đã thu phí
      if (r.paymentStatus !== 'paid' && r.totalAmount <= 0) {
        return false;
      }

      // Lọc theo trạng thái nộp tiền:
      // Khi bấm nộp tiền thì những phiếu đã nộp rồi KHÔNG HIỂN THỊ NỮA trong viewMode 'unsubmitted'
      if (viewMode === 'unsubmitted' && r.submitted === true) {
        return false;
      }
      if (viewMode === 'submitted' && r.submitted !== true) {
        return false;
      }

      // Lọc theo ngày (Từ ngày đến ngày)
      if (startDate || endDate) {
        const checkDate = r.collectedDate || r.date;
        if (startDate && checkDate < startDate) return false;
        if (endDate && checkDate > endDate) return false;
      }

      // 1. LỌC THEO TÊN NGƯỜI THU (So sánh linh hoạt họ tên đầy đủ hoặc tên)
      if (selectedStaff !== 'all') {
        const receiptCollectorFull = getFullStaffName(r.collectorName, staffList);
        const receiptCollectorShort = getShortStaffName(r.collectorName);
        const selectedShort = getShortStaffName(selectedStaff);
        const matches =
          r.collectorName === selectedStaff ||
          receiptCollectorFull === selectedStaff ||
          receiptCollectorShort === selectedShort;
        if (!matches) {
          return false;
        }
      }

      // Lọc theo hình thức thanh toán
      if (selectedMethod !== 'all' && r.paymentMethod !== selectedMethod) {
        return false;
      }

      return true;
    });
  }, [receipts, viewMode, startDate, endDate, selectedStaff, selectedMethod, staffList]);

  // Aggregate stats
  const totalRevenue = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [filteredReceipts]);

  // Breakdown by 3 payment methods
  const cashOnlyReceipts = useMemo(
    () => filteredReceipts.filter((r) => r.paymentMethod === 'TIỀN MẶT'),
    [filteredReceipts]
  );
  const cashInvoiceReceipts = useMemo(
    () => filteredReceipts.filter((r) => r.paymentMethod === 'TIỀN MẶT - XUẤT HÓA ĐƠN'),
    [filteredReceipts]
  );
  const transferInvoiceReceipts = useMemo(
    () => filteredReceipts.filter((r) => r.paymentMethod === 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN'),
    [filteredReceipts]
  );

  const cashOnlyRevenue = cashOnlyReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const cashInvoiceRevenue = cashInvoiceReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const transferInvoiceRevenue = transferInvoiceReceipts.reduce((sum, r) => sum + r.totalAmount, 0);

  // 3. TỔNG TIỀN MẶT: gồm TIỀN MẶT và TIỀN MẶT - XUẤT HÓA ĐƠN
  const totalCash = useMemo(() => {
    return cashOnlyRevenue + cashInvoiceRevenue;
  }, [cashOnlyRevenue, cashInvoiceRevenue]);

  // Danh sách các phiếu tiền mặt cần nộp (chưa nộp): gồm TIỀN MẶT và TIỀN MẶT - XUẤT HÓA ĐƠN
  const cashReceiptsPendingDeposit = useMemo(() => {
    return filteredReceipts.filter(
      (r) =>
        r.submitted !== true &&
        (r.paymentMethod === 'TIỀN MẶT' || r.paymentMethod === 'TIỀN MẶT - XUẤT HÓA ĐƠN')
    );
  }, [filteredReceipts]);

  const totalCashPendingDeposit = useMemo(() => {
    return cashReceiptsPendingDeposit.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [cashReceiptsPendingDeposit]);

  // Danh sách các phiếu đề nghị xuất hóa đơn cần nộp/bàn giao (chưa nộp): gồm TM - HÓA ĐƠN và CK - HÓA ĐƠN
  const invoiceReceiptsPendingDeposit = useMemo(() => {
    return filteredReceipts.filter(
      (r) =>
        r.submitted !== true &&
        (r.paymentMethod === 'TIỀN MẶT - XUẤT HÓA ĐƠN' || r.paymentMethod === 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN')
    );
  }, [filteredReceipts]);

  // Tất cả các phiếu cần bàn giao nộp (gồm cả tiền mặt và phiếu hóa đơn chuyển khoản)
  const allPendingDepositReceipts = useMemo(() => {
    return filteredReceipts.filter((r) => r.submitted !== true);
  }, [filteredReceipts]);

  // Counts for tabs
  const unsubmittedCount = receipts.filter(
    (r) => r.paymentStatus === 'paid' && r.submitted !== true
  ).length;
  const submittedCount = receipts.filter(
    (r) => r.paymentStatus === 'paid' && r.submitted === true
  ).length;

  // Month & date range formatted for official print header
  const reportMonthYear = useMemo(() => {
    if (filteredReceipts.length > 0) {
      const firstDate = filteredReceipts[0].collectedDate || filteredReceipts[0].date;
      const parts = firstDate.split('-');
      if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
    }
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${m}/${now.getFullYear()}`;
  }, [filteredReceipts]);

  const reportFromDate = useMemo(() => {
    if (startDate) return formatDateVN(startDate);
    if (filteredReceipts.length > 0) {
      const dates = filteredReceipts.map((r) => r.collectedDate || r.date).sort();
      return formatDateVN(dates[0]);
    }
    return `01/${reportMonthYear}`;
  }, [startDate, filteredReceipts, reportMonthYear]);

  const reportToDate = useMemo(() => {
    if (endDate) return formatDateVN(endDate);
    if (filteredReceipts.length > 0) {
      const dates = filteredReceipts.map((r) => r.collectedDate || r.date).sort();
      return formatDateVN(dates[dates.length - 1]);
    }
    return formatDateVN(todayStr);
  }, [endDate, filteredReceipts, todayStr]);

  // 4. MỞ MODAL NỘP TIỀN
  const handleOpenNopTienModal = () => {
    if (filteredReceipts.length === 0) {
      alert('Không có phiếu thu nào trong bảng kê để nộp tiền!');
      return;
    }

    if (allPendingDepositReceipts.length === 0) {
      alert('Hiện không có phiếu thu nào chưa nộp trong danh sách đang lọc!');
      return;
    }

    // Mặc định chọn tất cả phiếu nếu chưa chọn phiếu nào
    if (selectedReceiptIdsToSubmit.length === 0) {
      setSelectedReceiptIdsToSubmit(allPendingDepositReceipts.map((r) => r.id));
    }
    setSubmissionDate(todayStr);
    setShowNopTienModal(true);
  };

  // Tích chọn / Bỏ chọn từng phiếu
  const handleToggleSelectReceipt = (id: string) => {
    setSelectedReceiptIdsToSubmit((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Nút Chọn tất cả phiếu chưa nộp
  const handleSelectAllPending = () => {
    setSelectedReceiptIdsToSubmit(allPendingDepositReceipts.map((r) => r.id));
  };

  // Nút Bỏ chọn tất cả
  const handleDeselectAllPending = () => {
    setSelectedReceiptIdsToSubmit([]);
  };

  // Danh sách các phiếu ĐÃ CHỌN trong danh sách chờ nộp
  const selectedPendingReceipts = useMemo(() => {
    return allPendingDepositReceipts.filter((r) => selectedReceiptIdsToSubmit.includes(r.id));
  }, [allPendingDepositReceipts, selectedReceiptIdsToSubmit]);

  // Các phiếu tiền mặt ĐÃ CHỌN
  const selectedCashReceipts = useMemo(() => {
    return selectedPendingReceipts.filter(
      (r) => r.paymentMethod === 'TIỀN MẶT' || r.paymentMethod === 'TIỀN MẶT - XUẤT HÓA ĐƠN'
    );
  }, [selectedPendingReceipts]);

  // Tổng tiền mặt ĐÃ CHỌN
  const selectedTotalCash = useMemo(() => {
    return selectedCashReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [selectedCashReceipts]);

  // Các phiếu xuất hóa đơn ĐÃ CHỌN
  const selectedInvoiceReceipts = useMemo(() => {
    return selectedPendingReceipts.filter(
      (r) =>
        r.paymentMethod === 'TIỀN MẶT - XUẤT HÓA ĐƠN' ||
        r.paymentMethod === 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN'
    );
  }, [selectedPendingReceipts]);

  // Số lượng TM - Xuất HĐ đã chọn
  const selectedCashInvoiceCount = useMemo(() => {
    return selectedPendingReceipts.filter(
      (r) => r.paymentMethod === 'TIỀN MẶT - XUẤT HÓA ĐƠN'
    ).length;
  }, [selectedPendingReceipts]);

  // Số lượng CK - Xuất HĐ đã chọn
  const selectedTransferInvoiceCount = useMemo(() => {
    return selectedPendingReceipts.filter(
      (r) => r.paymentMethod === 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN'
    ).length;
  }, [selectedPendingReceipts]);

  // Xác nhận nộp tiền mặt và phiếu xuất hóa đơn trong modal
  const handleConfirmSubmitCash = () => {
    if (selectedReceiptIdsToSubmit.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 phiếu để thực hiện nộp tiền!');
      return;
    }

    onBulkSubmitReceipts(selectedReceiptIdsToSubmit, submissionDate);

    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#047857', '#10B981', '#F59E0B', '#1E3A8A'],
      });
    } catch {
      // ignore
    }

    setShowNopTienModal(false);
    const count = selectedReceiptIdsToSubmit.length;
    setSelectedReceiptIdsToSubmit([]);
    setSubmitSuccessMsg(
      `Đã nộp tiền thành công: Tổng tiền ${formatVND(selectedTotalCash)} (${count} phiếu) vào ngày ${formatDateVN(submissionDate)}!`
    );
    setTimeout(() => setSubmitSuccessMsg(null), 5000);
  };

  // 2. KHI BẤM NÚT IN BIÊN BẢN -> MỞ CỬA SỔ HIỂN THỊ BẢN IN
  const handleOpenPrintPreview = () => {
    if (filteredReceipts.length === 0) {
      alert('Bảng kê hiện đang trống, không có dữ liệu để in biên bản!');
      return;
    }
    setShowPrintPreviewModal(true);
  };

  // Thực hiện lệnh in ra máy in / lưu PDF từ cửa sổ bản in (Chỉ in duy nhất 1 bản biên bản, giữ nguyên 100% định dạng như bản xem trước)
  // Thực hiện lệnh in ra máy in / lưu PDF từ cửa sổ bản in (Chỉ in duy nhất 1 bản biên bản, khắc phục triệt để lỗi giấy trắng trơn)
  const handleExecutePrint = () => {
    const reportElement = document.getElementById('printable-report');
    if (!reportElement) {
      document.body.classList.add('printing-report');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-report'), 1000);
      return;
    }

    // Dọn dẹp iframe in cũ nếu có để tránh trùng lặp
    const oldFrame = document.getElementById('print-report-frame');
    if (oldFrame && oldFrame.parentNode) {
      oldFrame.parentNode.removeChild(oldFrame);
    }

    // Lấy toàn bộ thẻ <style> và <link rel="stylesheet"> từ trang chính để mang sang iframe
    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    // Tạo iframe ẩn độc lập để máy in chỉ nhận đúng 1 tài liệu duy nhất và 1 trang A5 duy nhất
    // QUAN TRỌNG: KHÔNG ĐƯỢC để visibility: hidden, display: none hoặc width/height = 0 vì trình duyệt sẽ in ra trang trắng trơn!
    // Đặt iframe ngoài màn hình (left: -9999px) với kích thước khổ A5 thật (210mm x 148mm) và opacity: 0
    const iframe = document.createElement('iframe');
    iframe.id = 'print-report-frame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '148mm';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.classList.add('printing-report');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-report'), 1000);
      return;
    }

    // Sao chép nội dung chính xác của biên bản
    const contentHtml = reportElement.outerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Bien_Ban_Thu_Phi_Neo_Dau</title>
          ${headStyles}
          <style>
            @page {
              size: A5 landscape;
              margin: 4mm 6mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              visibility: visible !important;
            }
            html, body {
              width: 100% !important;
              height: auto !important;
              background: #fff !important;
              color: #000 !important;
              font-family: "Times New Roman", "Tinos", Times, serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              visibility: visible !important;
            }
            body * {
              visibility: visible !important;
            }
            @media print {
              html, body {
                visibility: visible !important;
                background: #fff !important;
                color: #000 !important;
                font-family: "Times New Roman", "Tinos", Times, serif !important;
              }
              body * {
                visibility: visible !important;
              }
              #printable-report, #printable-report * {
                visibility: visible !important;
                font-family: "Times New Roman", "Tinos", Times, serif !important;
              }
              table {
                visibility: visible !important;
                display: table !important;
                font-family: "Times New Roman", "Tinos", Times, serif !important;
              }
              thead {
                display: table-header-group !important;
                visibility: visible !important;
              }
              tbody {
                display: table-row-group !important;
                visibility: visible !important;
              }
              tr {
                display: table-row !important;
                visibility: visible !important;
              }
              th, td {
                display: table-cell !important;
                visibility: visible !important;
                font-family: "Times New Roman", "Tinos", Times, serif !important;
              }
            }
            #printable-report,
            #printable-report *,
            #printable-report table,
            #printable-report td,
            #printable-report th,
            #printable-report span,
            #printable-report div {
              font-family: "Times New Roman", "Tinos", Times, serif !important;
            }
            #printable-report {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              visibility: visible !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              table-layout: fixed !important;
              margin-bottom: 6px !important;
            }
            th, td {
              border: 1px solid #000 !important;
              padding: 2px 4px !important;
              font-size: 8.5pt !important;
              line-height: 1.25 !important;
              visibility: visible !important;
            }
            th {
              background-color: #f8fafc !important;
              font-weight: bold !important;
              text-align: center !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .text-center { text-align: center !important; }
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .font-bold, .font-black, .font-extrabold { font-weight: bold !important; }
            .font-normal { font-weight: normal !important; }
            .whitespace-nowrap { white-space: nowrap !important; }
            .uppercase { text-transform: uppercase !important; }
            .italic { font-style: italic !important; }
          </style>
        </head>
        <body class="printing-report">
          ${contentHtml}
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Lỗi in qua iframe:', err);
        document.body.classList.add('printing-report');
        window.print();
        setTimeout(() => document.body.classList.remove('printing-report'), 1000);
      }
    };

    // Lắng nghe sự kiện sau khi in xong để dọn dẹp iframe mà không làm mất trang in
    if (iframe.contentWindow) {
      iframe.contentWindow.addEventListener('afterprint', () => {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 500);
      });
    }

    // Thời gian dọn dẹp an toàn dự phòng (60 giây để không đóng iframe khi người dùng đang xem hộp thoại in)
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 60000);

    // Đợi 350ms để nội dung tài liệu và kiểu dáng hoàn tất render rồi gọi lệnh in
    setTimeout(triggerPrint, 350);
  };

  const handleExportExcel = () => {
    if (filteredReceipts.length === 0) {
      alert('Không có dữ liệu biên lai trong bảng kê để xuất Excel!');
      return;
    }
    exportReceiptsToExcel(filteredReceipts, config, `Bang_Ke_Thu_Phi_Cang_Thanh_Phuoc`);
  };

  const handleCopyTSV = () => {
    if (filteredReceipts.length === 0) {
      alert('Không có dữ liệu để sao chép!');
      return;
    }
    const success = copyToClipboardTSV(filteredReceipts);
    if (success) {
      setCopyStatus('Đã sao chép vào bộ nhớ tạm! Bạn có thể dán (Ctrl+V) thẳng vào Google Sheets.');
      setTimeout(() => setCopyStatus(null), 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs">
              03
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Báo Cáo & Bảng Kê Thu Phí Neo Đậu
            </h2>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {submitSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{submitSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccessMsg(null)}
            className="font-bold underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {copyStatus && (
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-300 text-teal-900 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            ✓ {copyStatus}
          </span>
          <button
            type="button"
            onClick={() => setCopyStatus(null)}
            className="font-bold underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ========================================================
          BỘ LỌC DỮ LIỆU: CHẾ ĐỘ XEM, NGÀY & NGƯỜI THU
      ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-xs">
        {/* Hàng 1: Chuyển tab trạng thái nộp tiền */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('unsubmitted')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'unsubmitted'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bảng kê chưa nộp tiền ({unsubmittedCount})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('submitted')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'submitted'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch sử đã nộp tiền ({submittedCount})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Lọc Ngày: từ ngày đến ngày */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600 font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" /> Ngày:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Từ</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 font-medium">Đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              />
              {(startDate || endDate) && (
                <span className="text-[11px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                  {startDate ? formatDateVN(startDate) : '...'} - {endDate ? formatDateVN(endDate) : '...'}
                </span>
              )}
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-0.5"
                  title="Xóa khoảng ngày"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hàng 2: BỘ LỌC THEO TÊN NGƯỜI THU & HÌNH THỨC THANH TOÁN */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 1. VẪN GIỮ BỘ LỌC THEO TÊN NGƯỜI THU */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-700" />
              <span>Người thu:</span>
            </span>

            {/* Nút "Tất cả" */}
            <button
              type="button"
              onClick={() => handleSelectStaff('all')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                selectedStaff === 'all'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Tất cả
            </button>

            {/* Các nút chọn từng người thu */}
            {availableCollectors.map((cName) => {
              const isSelected = selectedStaff === cName;
              return (
                <button
                  key={cName}
                  type="button"
                  onClick={() => handleSelectStaff(cName)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-300'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  {cName}
                </button>
              );
            })}
          </div>

          {/* Lọc hình thức thanh toán */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Hình thức:</span>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="TIỀN MẶT">Tiền mặt</option>
              <option value="TIỀN MẶT - XUẤT HÓA ĐƠN">TM - Hóa đơn</option>
              <option value="CHUYỂN KHOẢN - XUẤT HÓA ĐƠN">CK - Hóa đơn</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. THẺ TỔNG HỢP: "TỔNG TIỀN MẶT"
      ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: TỔNG TIỀN MẶT */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-blue-800/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-200 text-xs font-semibold mb-2">
              <span className="font-bold tracking-wide uppercase text-amber-300 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-400" />
                TỔNG TIỀN MẶT
              </span>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                {cashOnlyReceipts.length + cashInvoiceReceipts.length} lượt
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-amber-300 leading-tight">
              {formatVND(totalCash)}
            </div>
          </div>
          <p className="text-[11px] text-blue-200/90 mt-2 truncate">
            {numberToVietnameseWords(totalCash)}
          </p>
        </div>

        {/* Card 2: TỔNG PHIẾU XUẤT HÓA ĐƠN */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-700 text-xs font-semibold mb-2">
              <span className="font-bold tracking-wide uppercase text-blue-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                TỔNG PHIẾU XUẤT HÓA ĐƠN
              </span>
              <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                {cashInvoiceReceipts.length + transferInvoiceReceipts.length} phiếu
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-blue-800 leading-tight">
              {cashInvoiceReceipts.length + transferInvoiceReceipts.length} <span className="text-base font-bold text-slate-600">phiếu</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>• TM - Xuất HĐ: <strong className="font-mono-num text-slate-800">{cashInvoiceReceipts.length} phiếu</strong></span>
            <span>• CK - Xuất HĐ: <strong className="font-mono-num text-slate-800">{transferInvoiceReceipts.length} phiếu</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================
          BẢNG KÊ (STT, THỜI GIAN, PHƯƠNG TIỆN, CHỦ PHƯƠNG TIỆN/THUYỀN TRƯỞNG,
          TRỌNG TẢI, TÊN HÀNG HÓA, NGƯỜI THU, SỐ THU, GHI CHÚ)
      ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Title Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-400" />
              <span>BẢNG KÊ</span>
            </h2>
            {selectedStaff !== 'all' && (
              <p className="text-xs text-amber-300 mt-0.5 font-semibold">
                (Người thu: {selectedStaff})
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {viewMode !== 'submitted' && allPendingDepositReceipts.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllPending}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Chọn tất cả ({allPendingDepositReceipts.length})
                </button>
                {selectedReceiptIdsToSubmit.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAllPending}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-medium text-xs cursor-pointer transition-colors"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            )}
            <div className="text-xs text-slate-300 font-mono-num bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
              Số lượng: <strong className="text-white text-sm">{filteredReceipts.length}</strong> phiếu
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700">
                {viewMode === 'unsubmitted'
                  ? 'Hiện không có phiếu thu nào chờ nộp tiền'
                  : 'Chưa có phiếu nào trong lịch sử đã nộp tiền'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Các phiếu sau khi thu phí ở mục [Thu Phí] sẽ tự động xuất hiện ở đây.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 uppercase text-[11px] sm:text-xs">
                  {viewMode !== 'submitted' && (
                    <th className="py-3 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          allPendingDepositReceipts.length > 0 &&
                          selectedReceiptIdsToSubmit.length === allPendingDepositReceipts.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectAllPending();
                          } else {
                            handleDeselectAllPending();
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        title={
                          selectedReceiptIdsToSubmit.length === allPendingDepositReceipts.length
                            ? 'Bỏ chọn tất cả'
                            : 'Chọn tất cả'
                        }
                      />
                    </th>
                  )}
                  <th className="py-3 px-3 text-center">STT</th>
                  <th className="py-3 px-3 text-center">THỜI GIAN</th>
                  <th className="py-3 px-3 text-center">PHƯƠNG TIỆN</th>
                  <th className="py-3 px-3">CHỦ PHƯƠNG TIỆN / THUYỀN TRƯỞNG</th>
                  <th className="py-3 px-3 text-right">TRỌNG TẢI</th>
                  <th className="py-3 px-3">TÊN HÀNG HÓA</th>
                  <th className="py-3 px-3 text-center">NGƯỜI THU</th>
                  <th className="py-3 px-3 text-right">SỐ THU</th>
                  <th className="py-3 px-3 text-center">GHI CHÚ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map((r, idx) => {
                  const isSelected = selectedReceiptIdsToSubmit.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isSelected && viewMode !== 'submitted'
                          ? 'bg-emerald-50/60 hover:bg-emerald-100/50'
                          : 'hover:bg-blue-50/40'
                      }`}
                    >
                      {/* Checkbox tích chọn phiếu nộp tiền */}
                      {viewMode !== 'submitted' && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectReceipt(r.id)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* STT */}
                      <td className="py-3 px-3 text-center text-slate-500 font-bold">
                        {idx + 1}
                      </td>

                      {/* THỜI GIAN */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {formatDateVN(r.collectedDate || r.date)}
                        </div>
                      </td>

                      {/* PHƯƠNG TIỆN */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-black text-slate-900 text-sm">
                          {r.vehiclePlate}
                        </div>
                      </td>

                      {/* CHỦ PHƯƠNG TIỆN / THUYỀN TRƯỞNG */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">
                          {r.ownerCaptain}
                        </div>
                      </td>

                      {/* TRỌNG TẢI (DWT) */}
                      <td className="py-3 px-3 text-right font-bold text-blue-800 whitespace-nowrap">
                        {formatNumberVN(r.dwt)}
                      </td>

                      {/* TÊN HÀNG HÓA */}
                      <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {r.cargoType}
                      </td>

                      {/* NGƯỜI THU (Chỉ ghi Tên, không cần ghi họ và tên) */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                        {getShortStaffName(r.collectorName) || '—'}
                      </td>

                      {/* SỐ THU */}
                      <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                        {formatNumberVN(r.totalAmount)}
                      </td>

                      {/* GHI CHÚ */}
                      <td className="py-3 px-3 text-center text-xs font-semibold text-slate-700 whitespace-nowrap">
                        <div>{r.paymentMethod}</div>
                        {r.submitted && r.submittedAt && (
                          <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 border border-emerald-200">
                            Đã nộp: {formatDateVN(r.submittedAt.slice(0, 10))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {/* DÒNG TỔNG CỘNG */}
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs sm:text-sm">
                  <td colSpan={viewMode !== 'submitted' ? 8 : 7} className="py-3 px-3 text-right uppercase">
                    TỔNG TIỀN MẶT CẦN NỘP:
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 text-base font-black whitespace-nowrap">
                    {formatNumberVN(totalCash)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Thanh trạng thái chọn phiếu nộp tiền */}
        {viewMode !== 'submitted' && allPendingDepositReceipts.length > 0 && (
          <div className="px-5 py-2.5 bg-emerald-50/70 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-900">
                Tích chọn nộp tiền:
              </span>
              <span className="bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-full text-xs">
                {selectedReceiptIdsToSubmit.length} / {allPendingDepositReceipts.length} phiếu đã chọn
              </span>
              {selectedTotalCash > 0 && (
                <span className="text-emerald-800 font-black">
                  • Tổng tiền mặt đã chọn: {formatVND(selectedTotalCash)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllPending}
                className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Chọn tất cả ({allPendingDepositReceipts.length})
              </button>
              {selectedReceiptIdsToSubmit.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAllPending}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tiền bằng chữ */}
        {filteredReceipts.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs italic text-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              Tổng số tiền viết bằng chữ:{' '}
              <strong className="text-slate-900 not-italic">
                {numberToVietnameseWords(totalRevenue)}
              </strong>
            </div>
            <div className="text-slate-500 font-semibold text-[11px]">
              (Tiền mặt: {formatVND(totalCash)})
            </div>
          </div>
        )}

        {/* ========================================================
            DƯỚI BẢNG NÀY: NÚT "NỘP TIỀN" VÀ "IN BIÊN BẢN"
        ======================================================== */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* NÚT: NỘP TIỀN (Mở popup danh sách tiền mặt) */}
            {viewMode !== 'submitted' && (
              <button
                type="button"
                onClick={handleOpenNopTienModal}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
              >
                <CheckCircle className="w-5 h-5 text-amber-300" />
                <span>NỘP TIỀN</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-800 text-white text-xs font-bold">
                  {selectedReceiptIdsToSubmit.length > 0
                    ? `${selectedReceiptIdsToSubmit.length} đã chọn`
                    : `${cashReceiptsPendingDeposit.length} phiếu`}
                </span>
              </button>
            )}

            {/* NÚT: IN BIÊN BẢN -> MỞ CỬA SỔ HIỂN THỊ BẢN IN */}
            <button
              type="button"
              onClick={handleOpenPrintPreview}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-extrabold text-sm shadow-md shadow-blue-800/20 transition-all cursor-pointer"
            >
              <Printer className="w-5 h-5 text-teal-300" />
              <span>IN BIÊN BẢN</span>
            </button>
          </div>

          {/* Tùy chỉnh người ký / người nộp cho biên bản */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600 font-semibold">Người nộp trên biên bản:</span>
            {/* Quick select buttons from activeSignerNames */}
            <div className="flex flex-wrap items-center gap-1">
              {activeSignerNames.map((sig) => (
                <button
                  key={sig}
                  type="button"
                  onClick={() => setPrintSignerName(sig)}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                    printSignerName === sig
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {sig.split(' ').slice(-2).join(' ')}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={printSignerName}
              onChange={(e) => setPrintSignerName(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white w-48"
              placeholder="Họ tên người nộp..."
            />
          </div>
        </div>

        {/* ========================================================
            XEM TRƯỚC GÓC PHẢI CUỐI BIÊN BẢN TRÊN TRANG
        ======================================================== */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-col items-end text-xs text-slate-800">
            {/* Ngày tháng hôm nay in biên bản */}
            <div className="italic font-medium text-slate-800 mb-1 text-right">
              {getTodayVietnameseDate()}
            </div>

            {/* Chữ ký NGƯỜI NỘP căn góc phải */}
            <div className="w-56 text-center space-y-1">
              <div className="font-extrabold uppercase text-slate-900 text-xs tracking-wider">
                NGƯỜI NỘP
              </div>
              <div className="italic text-[11px] text-slate-400">
                (Ký, ghi rõ họ tên)
              </div>
              <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                [Chữ ký]
              </div>
              <div className="font-extrabold text-slate-900 text-sm">
                {printSignerName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. MODAL: DANH SÁCH TIỀN MẶT CẦN NỘP & TỔNG TIỀN
      ======================================================== */}
      {showNopTienModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-700 rounded-lg">
                  <Banknote className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base uppercase tracking-wide">
                    DANH SÁCH TIỀN MẶT CẦN NỘP
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Bàn giao nộp tiền quỹ Cảng Thạnh Phước (Biconsi Group)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNopTienModal(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* KHỐI 1: CHỌN NGÀY NỘP TIỀN (Theo yêu cầu: Thêm ngày nộp) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                  <label htmlFor="modalSubmissionDateInput" className="font-bold text-slate-800 text-sm whitespace-nowrap">
                    Ngày nộp tiền:
                  </label>
                  <input
                    id="modalSubmissionDateInput"
                    type="date"
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setSubmissionDate(todayStr)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      submissionDate === todayStr
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white border border-slate-300 hover:bg-emerald-100 text-slate-700'
                    }`}
                  >
                    Hôm nay
                  </button>
                </div>
                <div className="text-xs text-emerald-900 font-medium">
                  Ngày ghi nhận nộp: <strong className="font-bold underline text-emerald-800">{formatDateVN(submissionDate)}</strong>
                </div>
              </div>

              {/* KHỐI 2: CÁC NÚT THAO TÁC CHỌN PHIẾU (Tích chọn phiếu, Chọn tất cả, Bỏ chọn) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700 text-xs mr-1">Thao tác:</span>
                  {/* Nút Chọn tất cả */}
                  <button
                    type="button"
                    onClick={handleSelectAllPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4 text-emerald-200" />
                    <span>Chọn tất cả ({allPendingDepositReceipts.length})</span>
                  </button>
                  {/* Nút Bỏ chọn tất cả */}
                  <button
                    type="button"
                    onClick={handleDeselectAllPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>Bỏ chọn</span>
                  </button>
                </div>

                <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                  Đã chọn: <span className="text-emerald-700 text-sm font-black font-mono-num">{selectedReceiptIdsToSubmit.length}</span> / {allPendingDepositReceipts.length} phiếu
                </div>
              </div>

              {/* KHỐI 3: Hiển thị Tổng tiền mặt và Số phiếu xuất hóa đơn (CẬP NHẬT THEO CÁC PHIẾU ĐƯỢC CHỌN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Cột 1: Tổng tiền mặt cần nộp (Tính theo các phiếu được tích) */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                    TỔNG SỐ TIỀN MẶT CẦN NỘP ({selectedCashReceipts.length} phiếu đã chọn):
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-mono-num text-emerald-800 mt-1">
                    {formatVND(selectedTotalCash)}
                  </div>
                  <div className="text-[11px] italic text-emerald-900 mt-1 font-medium truncate">
                    Bằng chữ: <strong>{numberToVietnameseWords(selectedTotalCash)}</strong>
                  </div>
                </div>

                {/* Cột 2: Hiển thị số phiếu xuất hóa đơn (Tính theo các phiếu được tích) */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-700" />
                      SỐ PHIẾU XUẤT HÓA ĐƠN ({selectedInvoiceReceipts.length} phiếu đã chọn)
                    </span>
                    <div className="text-2xl sm:text-3xl font-black font-mono-num text-blue-800 mt-1">
                      {selectedInvoiceReceipts.length} <span className="text-sm font-bold text-slate-600">phiếu</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-blue-800/90 mt-1 font-semibold flex items-center gap-3">
                    <span>• TM - Xuất HĐ: <strong>{selectedCashInvoiceCount}</strong></span>
                    <span>• CK - Xuất HĐ: <strong>{selectedTransferInvoiceCount}</strong></span>
                  </div>
                </div>
              </div>

              {/* KHỐI 4: Bảng chi tiết các phiếu với CỘT TÍCH CHỌN CHECKBOX */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold sticky top-0 border-b border-slate-200 shadow-2xs z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={
                            allPendingDepositReceipts.length > 0 &&
                            selectedReceiptIdsToSubmit.length === allPendingDepositReceipts.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSelectAllPending();
                            } else {
                              handleDeselectAllPending();
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          title="Chọn / Bỏ chọn tất cả"
                        />
                      </th>
                      <th className="py-2.5 px-2 text-center">STT</th>
                      <th className="py-2.5 px-3 text-center">THỜI GIAN</th>
                      <th className="py-2.5 px-3 text-center">PHƯƠNG TIỆN</th>
                      <th className="py-2.5 px-3">CHỦ PHƯƠNG TIỆN</th>
                      <th className="py-2.5 px-3 text-center">NGƯỜI THU</th>
                      <th className="py-2.5 px-3 text-center">HÌNH THỨC</th>
                      <th className="py-2.5 px-3 text-right">SỐ TIỀN MẶT NỘP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allPendingDepositReceipts.map((r, idx) => {
                      const isSelected = selectedReceiptIdsToSubmit.includes(r.id);
                      const isTransfer = r.paymentMethod === 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN';
                      return (
                        <tr
                          key={r.id}
                          onClick={() => handleToggleSelectReceipt(r.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/70 hover:bg-emerald-100/60'
                              : 'bg-white hover:bg-slate-50 opacity-60'
                          }`}
                        >
                          {/* Checkbox tích chọn từng phiếu */}
                          <td
                            className="py-2 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectReceipt(r.id)}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-mono-num font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap text-slate-800">
                            {formatDateVN(r.collectedDate || r.date)}
                          </td>
                          <td className="py-2 px-3 text-center font-extrabold text-slate-900 font-mono-num whitespace-nowrap">
                            {r.vehiclePlate}
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium truncate max-w-[150px]">
                            {r.ownerCaptain}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">
                            {r.collectorName}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                isTransfer
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : r.paymentMethod === 'TIỀN MẶT - XUẤT HÓA ĐƠN'
                                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {r.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono-num whitespace-nowrap">
                            {isTransfer ? (
                              <div className="flex flex-col items-end">
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                  Thu phiếu (Không thu tiền)
                                </span>
                                <span className="text-[10px] text-slate-400 line-through">
                                  {formatNumberVN(r.totalAmount)} đ
                                </span>
                              </div>
                            ) : (
                              <span className={`text-sm font-black ${isSelected ? 'text-emerald-800' : 'text-slate-400'}`}>
                                {formatNumberVN(r.totalAmount)} đ
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-800 border-t border-slate-200">
                      <td colSpan={7} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        TỔNG TIỀN MẶT ĐÃ CHỌN ({selectedCashReceipts.length} PHIẾU):
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-800 font-black text-sm whitespace-nowrap">
                        {formatNumberVN(selectedTotalCash)} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium order-2 sm:order-1">
                  {selectedReceiptIdsToSubmit.length === 0 ? (
                    <span className="text-amber-600 font-bold">
                      ⚠ Vui lòng tích chọn ít nhất 1 phiếu để nộp tiền
                    </span>
                  ) : (
                    <span>
                      Sẽ nộp <strong className="text-emerald-700 font-bold">{selectedReceiptIdsToSubmit.length}</strong> phiếu vào ngày <strong className="text-slate-900 font-bold">{formatDateVN(submissionDate)}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={() => setShowNopTienModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>

                  <button
                    type="button"
                    disabled={selectedReceiptIdsToSubmit.length === 0}
                    onClick={handleConfirmSubmitCash}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-extrabold text-sm shadow-md transition-all cursor-pointer ${
                      selectedReceiptIdsToSubmit.length === 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-700/20'
                    }`}
                  >
                    <Check className="w-5 h-5 text-amber-300" />
                    <span>
                      XÁC NHẬN NỘP ({selectedReceiptIdsToSubmit.length} PHIẾU
                      {selectedTotalCash > 0 ? ` - ${formatVND(selectedTotalCash)}` : ''})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. CỬA SỔ XEM TRƯỚC BẢN IN (KHI BẤM "IN BIÊN BẢN" CẦN HIỂN THỊ BẢN IN)
      ======================================================== */}
      {showPrintPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col overflow-y-auto">
          {/* Top Control Bar */}
          <div className="sticky top-0 z-20 bg-slate-900 text-white p-3 sm:px-6 sm:py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  BẢN IN BIÊN BẢN THU PHÍ NEO ĐẬU SÀ LAN
                </h3>
                <p className="text-[11px] text-slate-400">
                  Xem trước bản in khổ A4 chuẩn biểu mẫu Cảng Thạnh Phước
                </p>
              </div>
            </div>

            {/* Controls & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sửa nhanh người nộp */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                <span className="text-slate-300">Người nộp:</span>
                <div className="hidden md:flex items-center gap-1 mr-1">
                  {activeSignerNames.map((sig) => (
                    <button
                      key={sig}
                      type="button"
                      onClick={() => setPrintSignerName(sig)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                        printSignerName === sig
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      {sig.split(' ').slice(-2).join(' ')}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={printSignerName}
                  onChange={(e) => setPrintSignerName(e.target.value)}
                  className="bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-xs border border-slate-600 w-36 sm:w-44 focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Nút In ra máy in */}
              <button
                type="button"
                onClick={handleExecutePrint}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>IN RA MÁY IN</span>
              </button>

              {/* Nút Đóng */}
              <button
                type="button"
                onClick={() => setShowPrintPreviewModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng bản in"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Vùng hiển thị tờ giấy A5 ngang trên màn hình */}
          <div className="flex-1 bg-slate-200/70 p-4 sm:p-6 flex justify-center overflow-x-auto">
            <div
              id="printable-report"
              className="bg-white text-black shadow-2xl border border-slate-300 w-full max-w-[920px] p-5 sm:p-7 leading-normal rounded-xs select-text my-2"
              style={{
                fontFamily: '"Times New Roman", "Tinos", Times, serif',
                minHeight: 'auto',
              }}
            >
              {/* Header Công ty góc trái trên (chuẩn 100% theo mẫu) */}
              <div className="text-left mb-2.5 space-y-0.5">
                <div className="font-bold text-[12px] uppercase text-black tracking-normal">
                  {config.companyName || 'CÔNG TY CỔ PHẦN CẢNG THẠNH PHƯỚC'}
                </div>
                <div className="text-[10px] sm:text-[10.5px] italic text-black leading-tight">
                  Địa chỉ: {config.address || '207, KP Tân Lương, P.Tân Khánh, TP. Hồ Chí Minh'}
                </div>
                <div className="text-[10px] sm:text-[10.5px] italic text-black leading-tight">
                  {config.phone && config.fax
                    ? `Điện thoại: ${config.phone} - Fax: ${config.fax}`
                    : (config.hotline?.includes('Fax')
                        ? (config.hotline.startsWith('Điện thoại:') ? config.hotline : `Điện thoại: ${config.hotline}`)
                        : 'Điện thoại: (0274) 3849999 - Fax: (0274) 3629434')}
                </div>
                <div className="text-[10px] sm:text-[10.5px] italic text-black leading-tight">
                  MST: {config.taxCode || '3700849845'}
                </div>
              </div>

              {/* Tiêu đề chính giữa trang: PHÍ NEO ĐẬU SÀ LAN THÁNG 10/2026 */}
              <div className="text-center my-3">
                <h1 className="text-[16px] sm:text-[18px] font-black uppercase text-[#1E3A8A] tracking-wider">
                  PHÍ NEO ĐẬU SÀ LAN THÁNG {reportMonthYear}
                </h1>
                <div className="text-[11px] font-normal text-black mt-0.5">
                  Từ ngày:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{reportFromDate}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Đến ngày:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{reportToDate}
                </div>
              </div>

              {/* Bảng Kê chi tiết theo đúng 9 cột - cố định tỷ lệ cột để bản in luôn ngay ngắn tuyệt đối */}
              <table
                className="w-full text-[9.5px] border border-collapse border-black mb-2.5"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                  fontFamily: '"Times New Roman", "Tinos", Times, serif',
                }}
              >
                <colgroup>
                  <col style={{ width: '4%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '24%' }} />
                </colgroup>
                <thead>
                  <tr className="border border-black bg-slate-50/70 font-black text-center text-black uppercase">
                    <th className="border border-black px-1 py-1 text-center">STT</th>
                    <th className="border border-black px-1 py-1 text-center whitespace-nowrap">THỜI GIAN</th>
                    <th className="border border-black px-1 py-1 text-center whitespace-nowrap">PHƯƠNG TIỆN</th>
                    <th className="border border-black px-1 py-1 text-center">
                      CHỦ PHƯƠNG<br />TIỆN/THUYỀN TRƯỞNG
                    </th>
                    <th className="border border-black px-1 py-1 text-center whitespace-nowrap">TRỌNG TẢI</th>
                    <th className="border border-black px-1 py-1 text-center">TÊN HÀNG HÓA</th>
                    <th className="border border-black px-1 py-1 text-center whitespace-nowrap">NGƯỜI THU</th>
                    <th className="border border-black px-1 py-1 text-center whitespace-nowrap">SỐ THU</th>
                    <th className="border border-black px-1 py-1 text-center whitespace-nowrap">GHI CHÚ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((r, i) => (
                    <tr key={r.id} className="border border-black text-black">
                      <td
                        className="border border-black px-1 py-0.5 text-center font-normal"
                        style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                      >
                        {i + 1}
                      </td>
                      <td
                        className="border border-black px-1 py-0.5 text-center whitespace-nowrap"
                        style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                      >
                        {formatDateVN(r.collectedDate || r.date)}
                      </td>
                      <td
                        className="border border-black px-1 py-0.5 font-normal text-center whitespace-nowrap"
                        style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                      >
                        {r.vehiclePlate}
                      </td>
                      <td className="border border-black px-1.5 py-0.5 text-left truncate" title={r.ownerCaptain}>
                        {r.ownerCaptain}
                      </td>
                      <td
                        className="border border-black px-1 py-0.5 text-right whitespace-nowrap"
                        style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                      >
                        {formatNumberVN(r.dwt)}
                      </td>
                      <td className="border border-black px-1.5 py-0.5 text-left truncate" title={r.cargoType}>
                        {r.cargoType}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-center whitespace-nowrap">
                        {getShortStaffName(r.collectorName) || '—'}
                      </td>
                      <td
                        className="border border-black px-1 py-0.5 text-right font-normal whitespace-nowrap"
                        style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                      >
                        {formatNumberVN(r.totalAmount)}
                      </td>
                      <td
                        className="border border-black px-1 py-0.5 text-center font-normal leading-tight"
                        style={{
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          fontSize: '8pt',
                          fontFamily: '"Times New Roman", "Tinos", Times, serif',
                        }}
                      >
                        {r.paymentMethod}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border border-black font-black text-black bg-slate-50/50">
                    <td colSpan={7} className="border border-black px-1.5 py-1 text-right uppercase">
                      TỔNG TIỀN MẶT:
                    </td>
                    <td
                      className="border border-black px-1 py-1 text-right font-black whitespace-nowrap"
                      style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                    >
                      {formatNumberVN(totalCash)}
                    </td>
                    <td className="border border-black"></td>
                  </tr>
                </tfoot>
              </table>

              {/* Phần cuối biên bản: Tổng hợp bên trái + Người nộp bên phải (Cố định 2 bên song song không bị thụt lùi hay xô lệch) */}
              <div
                className="flex items-start justify-between gap-4 mt-3 pt-2 text-black w-full"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  width: '100%',
                  fontFamily: '"Times New Roman", "Tinos", Times, serif',
                }}
              >
                {/* Góc trái: Tổng tiền và Tổng số phiếu đề nghị xuất hóa đơn - Đồng nhất font Times New Roman */}
                <div
                  className="text-left space-y-1.5 text-[11px]"
                  style={{
                    textAlign: 'left',
                    fontFamily: '"Times New Roman", "Tinos", Times, serif',
                  }}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>• Tổng tiền:</span>
                    <span
                      className="font-bold text-[11.5px] underline"
                      style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                    >
                      {formatNumberVN(totalCash)} đ
                    </span>
                  </div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>• Tổng số phiếu đề nghị xuất hóa đơn:</span>
                    <span
                      className="font-bold text-[11.5px] underline"
                      style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                    >
                      {cashInvoiceReceipts.length + transferInvoiceReceipts.length} phiếu
                    </span>
                  </div>
                  <div
                    className="text-[10.5px] italic text-black"
                    style={{ fontFamily: '"Times New Roman", "Tinos", Times, serif' }}
                  >
                    Bằng chữ: <em>{numberToVietnameseWords(totalCash)}</em>
                  </div>
                </div>

                {/* Góc phải: Ngày tháng + NGƯỜI NỘP - Mở rộng khoảng cách để chừa chỗ ký tên rộng rãi */}
                <div
                  className="text-center space-y-1"
                  style={{
                    textAlign: 'center',
                    width: '240px',
                    minWidth: '220px',
                    fontFamily: '"Times New Roman", "Tinos", Times, serif',
                  }}
                >
                  <div className="text-[10.5px] italic">
                    {getTodayVietnameseDate()}
                  </div>
                  <div className="text-[11.5px] font-bold uppercase mt-0.5 tracking-wider">
                    NGƯỜI NỘP
                  </div>
                  {/* Khoảng trống ký tên rộng rãi thoải mái */}
                  <div style={{ height: '72px' }}></div>
                  <div className="text-[11.5px] font-bold">
                    {printSignerName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
