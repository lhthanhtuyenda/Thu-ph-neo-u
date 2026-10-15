import React, { useState, useMemo, useRef } from 'react';
import {
  Ship,
  Search,
  Calendar,
  Filter,
  DollarSign,
  UserCheck,
  CheckCircle,
  X,
  RotateCcw,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  Pencil,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ReceiptRecord, PortConfig, Staff, PaymentMethod } from '../types';
import { formatVND, formatDWT, numberToVietnameseWords } from '../utils/numberToWords';
import { getShortStaffName } from '../utils/staffHelpers';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { syncFeeToGoogleSheet } from '../utils/googleSheetsSync';
import { parseExcelFile, downloadExcelTemplate } from '../utils/excel';
import { formatDateVN, getTodayDateStr } from '../utils/dateHelpers';

interface PortManagementTableProps {
  receipts: ReceiptRecord[];
  config: PortConfig;
  staffList: Staff[];
  onOpenThermalReceipt: (receipt: ReceiptRecord) => void;
  onUpdateReceipt: (updatedReceipt: ReceiptRecord) => void;
  onDeleteReceipt: (id: string) => void;
  onImportReceipts?: (importedReceipts: ReceiptRecord[], mode?: 'merge' | 'replace') => void;
}

export const PortManagementTable: React.FC<PortManagementTableProps> = ({
  receipts,
  config,
  staffList,
  onOpenThermalReceipt,
  onUpdateReceipt,
  onDeleteReceipt,
  onImportReceipts,
}) => {

  // File input ref & Excel upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [importPreviewData, setImportPreviewData] = useState<ReceiptRecord[] | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // ========================================================
  // 1. LỌC DỮ LIỆU: LỌC THEO NGÀY, TÌM KIẾM & TRẠNG THÁI
  // ========================================================
  const [filterDate, setFilterDate] = useState<string>(''); // rỗng là tất cả các ngày
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Modal thu phí state
  const [selectedBargeForFee, setSelectedBargeForFee] = useState<ReceiptRecord | null>(null);
  const [feeDate, setFeeDate] = useState<string>(getTodayDateStr());
  const [feeCollector, setFeeCollector] = useState<string>(staffList[0]?.name || 'Tuấn');
  const [feeAmount, setFeeAmount] = useState<number>(400000);
  const [feeCustomAmount, setFeeCustomAmount] = useState<string>('');
  const [isCustomFee, setIsCustomFee] = useState<boolean>(false);
  const [feePaymentMethod, setFeePaymentMethod] = useState<PaymentMethod>('TIỀN MẶT');

  // Modal xác nhận xóa sà lan
  const [deletingReceipt, setDeletingReceipt] = useState<ReceiptRecord | null>(null);

  // Modal chỉnh sửa thông tin sà lan
  const [editingBarge, setEditingBarge] = useState<ReceiptRecord | null>(null);
  const [editPlate, setEditPlate] = useState<string>('');
  const [editOwner, setEditOwner] = useState<string>('');
  const [editDwt, setEditDwt] = useState<number | ''>('');
  const [editCargo, setEditCargo] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const handleOpenEditModal = (barge: ReceiptRecord) => {
    setEditingBarge(barge);
    setEditPlate(barge.vehiclePlate || '');
    setEditOwner(barge.ownerCaptain || '');
    setEditDwt(barge.dwt || '');
    setEditCargo(barge.cargoType || '');
    setEditDate(barge.date || '');
    setEditNotes(barge.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarge) return;

    if (!editPlate.trim()) {
      alert('Vui lòng nhập biển số sà lan!');
      return;
    }

    const updated: ReceiptRecord = {
      ...editingBarge,
      vehiclePlate: editPlate.trim().toUpperCase(),
      ownerCaptain: editOwner.trim(),
      dwt: Number(editDwt) || 0,
      cargoType: editCargo.trim(),
      date: editDate || editingBarge.date,
      notes: editNotes.trim(),
    };

    onUpdateReceipt(updated);
    setEditingBarge(null);
  };

  // Filtered dataset
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      // 1. Lọc theo ngày (theo Ngày cập bến hoặc Ngày thu)
      if (filterDate && r.date !== filterDate && r.collectedDate !== filterDate) {
        return false;
      }

      // 2. Tìm kiếm theo biển số, chủ tàu, hàng hóa
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchPlate = r.vehiclePlate.toLowerCase().includes(q);
        const matchOwner = r.ownerCaptain.toLowerCase().includes(q);
        const matchCargo = r.cargoType.toLowerCase().includes(q);
        if (!matchPlate && !matchOwner && !matchCargo) {
          return false;
        }
      }

      // 3. Lọc theo trạng thái: Đã thu vs Chưa thu
      const isPaid = r.paymentStatus === 'paid';
      if (statusFilter === 'paid' && !isPaid) {
        return false;
      }
      if (statusFilter === 'pending' && isPaid) {
        return false;
      }

      return true;
    });
  }, [receipts, filterDate, searchTerm, statusFilter]);

  // Counts for status chips
  const paidCount = receipts.filter((r) => r.paymentStatus === 'paid').length;
  const pendingCount = receipts.filter((r) => r.paymentStatus !== 'paid').length;

  // Open fee collection modal for a barge
  const handleOpenFeeModal = (barge: ReceiptRecord) => {
    setSelectedBargeForFee(barge);
    setFeeDate(barge.collectedDate || getTodayDateStr());
    const firstActiveStaff = staffList.find((s) => s.active !== false);
    const defaultCollector = barge.collectorName
      ? getShortStaffName(barge.collectorName)
      : (firstActiveStaff ? getShortStaffName(firstActiveStaff.name) : 'Tuấn');
    setFeeCollector(defaultCollector);
    const defaultAmount = barge.totalAmount > 0 ? barge.totalAmount : config.denominations[1] || 400000;
    setFeeAmount(defaultAmount);
    setIsCustomFee(!config.denominations.includes(defaultAmount));
    setFeeCustomAmount(String(defaultAmount));
    setFeePaymentMethod(barge.paymentMethod || 'TIỀN MẶT');
  };

  // Submit fee collection: "THU PHÍ"
  const handleConfirmFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBargeForFee) return;

    const finalAmount = isCustomFee ? parseFloat(feeCustomAmount) || 0 : feeAmount;
    if (finalAmount <= 0) {
      alert('Vui lòng chọn hoặc nhập số thu hợp lệ!');
      return;
    }
    if (!feeCollector.trim()) {
      alert('Vui lòng chọn người thu!');
      return;
    }

    const updated: ReceiptRecord = {
      ...selectedBargeForFee,
      collectedDate: feeDate,
      collectorName: feeCollector.trim(),
      totalAmount: finalAmount,
      paymentMethod: feePaymentMethod,
      paymentStatus: 'paid', // Đã thu phí
    };

    onUpdateReceipt(updated);

    // Tự động đồng bộ sang Google Sheets từ dòng B9 nếu đã có Webhook URL
    if (config.googleSheetsWebhookUrl) {
      syncFeeToGoogleSheet(updated, config).catch((err) => {
        console.warn('Lỗi đồng bộ Google Sheets:', err);
      });
    }

    // Fire celebration
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#059669', '#10B981', '#34D399'],
      });
    } catch {
      // ignore
    }

    setSelectedBargeForFee(null);
  };

  // Kích hoạt chọn file Excel
  const handleTriggerExcelUpload = () => {
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Xử lý khi người dùng chọn file Excel
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImportError(null);

    try {
      const res = await parseExcelFile(file);
      if (res.success && res.data.length > 0) {
        setImportPreviewData(res.data);
        setImportFileName(file.name);
      } else {
        setImportError(res.message || 'Không thể đọc dữ liệu sà lan từ file Excel này!');
      }
    } catch (err: any) {
      setImportError(err?.message || 'Đã xảy ra lỗi khi xử lý file Excel');
    } finally {
      setIsUploading(false);
    }
  };

  // Xác nhận ghi nhận dữ liệu Excel lên danh sách
  const handleConfirmImport = () => {
    if (!importPreviewData || importPreviewData.length === 0) return;

    if (onImportReceipts) {
      onImportReceipts(importPreviewData, importMode);
    }

    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#34D399', '#2563EB'],
      });
    } catch {
      // ignore
    }

    const count = importPreviewData.length;
    const fileName = importFileName;
    const isReplace = importMode === 'replace';
    setImportPreviewData(null);
    setImportFileName('');
    setImportSuccessMsg(
      isReplace
        ? `Đã thay thế toàn bộ danh sách bằng ${count} sà lan từ file "${fileName}" thành công!`
        : `Đã cập nhật & chống trùng lặp thành công ${count} sà lan từ file "${fileName}"!`
    );
    setTimeout(() => setImportSuccessMsg(null), 6000);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* File input ẩn dùng để chọn file Excel */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Thông báo thành công khi ghi nhận Excel */}
      {importSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-bold text-sm">{importSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportSuccessMsg(null)}
            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Thông báo lỗi nếu file Excel không hợp lệ */}
      {importError && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-2xl text-red-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="font-bold text-sm">{importError}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportError(null)}
            className="p-1 rounded-lg text-red-600 hover:bg-red-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          1. PHẦN LỌC DỮ LIỆU: LỌC THEO NGÀY
      ======================================================== */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-base text-slate-900">Lọc dữ liệu</h3>
          </div>
          {filterDate && (
            <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg font-medium">
              Đang lọc ngày: <strong>{formatDateVN(filterDate)}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center text-xs">
          {/* Lọc theo ngày */}
          <div className="md:col-span-5 flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              Lọc theo ngày:
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filterDate && (
              <span className="font-bold text-blue-900 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200">
                {formatDateVN(filterDate)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setFilterDate(getTodayDateStr())}
              className={`px-3 py-2 rounded-xl font-semibold transition-colors cursor-pointer ${
                filterDate === getTodayDateStr()
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Hôm nay
            </button>
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Xem tất cả các ngày"
              >
                Tất cả các ngày
              </button>
            )}
          </div>

          {/* Ô tìm kiếm */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm biển số, chủ tàu, hàng hóa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lọc trạng thái Đã thu vs Chưa thu */}
          <div className="md:col-span-3 flex items-center justify-start md:justify-end gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({receipts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã thu ({paidCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa thu ({pendingCount})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. DANH SÁCH SÀ LAN
      ======================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Danh sách sà lan
            </h2>
            <span className="ml-1 text-xs text-slate-500 font-mono-num bg-slate-200/70 px-2 py-0.5 rounded-md font-semibold">
              {filteredReceipts.length} sà lan
            </span>
          </div>

          {/* Các nút tải lên Excel và tải file mẫu */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerExcelUpload}
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Tải lên file Excel danh sách sà lan"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>{isUploading ? 'Đang đọc file...' : 'Tải lên file Excel'}</span>
            </button>
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Tải file Excel mẫu chuẩn"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>File mẫu</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500">
              <Ship className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700">Chưa có sà lan nào</p>
              <p className="text-xs text-slate-500 mt-1">
                Dữ liệu sẽ được hiển thị khi bạn nhập sà lan ở mục <strong>[Nhập]</strong>.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 sm:px-4">Biển Số Sà Lan</th>
                  <th className="py-3 px-3 sm:px-4">Chủ Tàu / Thuyền Trưởng</th>
                  <th className="py-3 px-3 sm:px-4">Trọng tải</th>
                  <th className="py-3 px-3 sm:px-4">Tên Hàng Hóa</th>
                  <th className="py-3 px-3 sm:px-4">Ngày Cập Bến</th>
                  <th className="py-3 px-3 sm:px-4">Ngày Thu</th>
                  <th className="py-3 px-3 sm:px-4">Số Thu</th>
                  <th className="py-3 px-3 sm:px-4">Người Thu</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Thu Phí</th>
                  <th className="py-3 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map((r) => {
                  const isPaid = r.paymentStatus === 'paid';
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* Biển số sà lan */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-extrabold text-slate-900 font-mono-num text-sm flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          {r.vehiclePlate}
                        </div>
                      </td>

                      {/* Chủ tàu / Thuyền trưởng */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-medium text-slate-800">
                          {r.ownerCaptain}
                        </div>
                      </td>

                      {/* Tải trọng DWT */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-bold text-blue-800 font-mono-num">
                          {formatDWT(r.dwt)}
                        </div>
                      </td>

                      {/* Tên hàng hóa */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-medium text-slate-700">
                          {r.cargoType}
                        </div>
                      </td>

                      {/* Ngày cập bến */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="text-slate-800 font-medium">
                          {formatDateVN(r.date)}
                        </div>
                      </td>

                      {/* Ngày thu */}
                      <td className="py-3 px-3 sm:px-4">
                        {isPaid && r.collectedDate ? (
                          <div className="text-slate-900 font-medium">
                            {formatDateVN(r.collectedDate)}
                          </div>
                        ) : isPaid ? (
                          <div className="text-slate-900 font-medium">
                            {formatDateVN(r.date)}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold">—</span>
                        )}
                      </td>

                      {/* Số thu: hiển thị số tiền đã chọn, nếu chưa thu thì hiển thị '—' */}
                      <td className="py-3 px-3 sm:px-4">
                        {isPaid && r.totalAmount > 0 ? (
                          <div className="font-extrabold font-mono-num text-emerald-700 text-sm">
                            {formatVND(r.totalAmount)}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold">—</span>
                        )}
                      </td>

                      {/* Người thu: hiển thị thông tin người thu, nếu chưa thu thì hiển thị '—' */}
                      <td className="py-3 px-3 sm:px-4">
                        {isPaid && r.collectorName ? (
                          <span className="font-bold text-slate-800">
                            {r.collectorName}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">—</span>
                        )}
                      </td>

                      {/* CỘT CUỐI: THU PHÍ */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        {!isPaid ? (
                          // Chưa thu: Hiển thị Nút màu đỏ "Thu phí"
                          <button
                            type="button"
                            onClick={() => handleOpenFeeModal(r)}
                            className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            Thu phí
                          </button>
                        ) : (
                          // Đã thu: Hiển thị màu xanh lá "Đã thu phí"
                          <button
                            type="button"
                            onClick={() => handleOpenFeeModal(r)}
                            title="Bấm để xem lại hoặc sửa đổi thông tin thu phí"
                            className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã thu phí</span>
                          </button>
                        )}
                      </td>

                      {/* Thao tác (Chỉnh sửa / Xóa) */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Nút Bút: Chỉnh sửa thông tin sà lan */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(r)}
                            title={`Chỉnh sửa thông tin sà lan ${r.vehiclePlate}`}
                            aria-label={`Chỉnh sửa thông tin sà lan ${r.vehiclePlate}`}
                            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all cursor-pointer border border-blue-200 hover:border-blue-600 shadow-2xs"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingReceipt(r)}
                            title={`Xóa sà lan ${r.vehiclePlate}`}
                            aria-label={`Xóa sà lan ${r.vehiclePlate}`}
                            className="p-2 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition-all cursor-pointer border border-rose-200 hover:border-rose-600 shadow-2xs"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
          <div>
            Hiển thị <strong className="text-slate-900">{filteredReceipts.length}</strong> trên tổng số{' '}
            <strong className="text-slate-900">{receipts.length}</strong> sà lan
          </div>
          <div className="flex items-center gap-4">
            <div>
              Đã thu:{' '}
              <strong className="text-emerald-700 font-mono-num font-bold">
                {formatVND(
                  filteredReceipts
                    .filter((r) => r.paymentStatus === 'paid')
                    .reduce((sum, r) => sum + r.totalAmount, 0)
                )}
              </strong>
            </div>
            <div>
              Chưa thu:{' '}
              <strong className="text-red-600 font-bold">
                {filteredReceipts.filter((r) => r.paymentStatus !== 'paid').length} sà lan
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL: THU PHÍ SÀ LAN
      ======================================================== */}
      {selectedBargeForFee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-800 rounded-lg">
                  <DollarSign className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Thu Phí Neo Đậu Sà Lan</h3>
                  <p className="text-xs text-blue-200">
                    Cảng Thạnh Phước - Biconsi Group
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBargeForFee(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmFee} className="p-5 space-y-5 text-xs">
              {/* 1. Thông tin sà lan */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase">
                  Thông tin sà lan:
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Biển số phương tiện:</span>
                  <span className="font-extrabold text-base text-blue-900 font-mono-num">
                    {selectedBargeForFee.vehiclePlate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Chủ tàu / Thuyền trưởng:</span>
                  <span className="font-bold text-slate-800">
                    {selectedBargeForFee.ownerCaptain}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Trọng tải (DWT):</span>
                  <span className="font-bold text-blue-700 font-mono-num">
                    {formatDWT(selectedBargeForFee.dwt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tên hàng hóa:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBargeForFee.cargoType}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Ngày cập bến:</span>
                  <span className="font-bold text-slate-900">
                    {formatDateVN(selectedBargeForFee.date)}
                  </span>
                </div>
              </div>

              {/* 2. Mục: Ngày thu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                    <Calendar className="w-4 h-4 text-blue-700" />
                    <span>Ngày thu</span>
                    <span className="text-rose-500">*</span>
                    <span className="text-[11px] text-blue-700 font-semibold ml-1">
                      (Định dạng: {formatDateVN(feeDate)})
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFeeDate(getTodayDateStr())}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Hôm nay</span>
                  </button>
                </div>
                <input
                  type="date"
                  required
                  value={feeDate}
                  onChange={(e) => setFeeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 3. Mục: Người thu */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  <span>Người thu</span>
                  <span className="text-rose-500">*</span>
                </label>

                {/* Các tên nhân viên chọn nhanh (chỉ lấy TÊN để áp dụng cho phần thu phí) */}
                <div className="flex flex-wrap items-center gap-2">
                  {staffList
                    .filter((st) => st.active !== false)
                    .map((st) => {
                      const shortName = getShortStaffName(st.name);
                      const isSelected = feeCollector === shortName || feeCollector === st.name;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setFeeCollector(shortName)}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-700 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          {shortName}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* 4. Mục: Số thu */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <DollarSign className="w-4 h-4 text-blue-700" />
                  <span>Số thu</span>
                  <span className="text-rose-500">*</span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {config.denominations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setFeeAmount(d);
                        setIsCustomFee(false);
                      }}
                      className={`px-3.5 py-2 rounded-xl border-2 font-mono-num font-bold text-sm transition-all cursor-pointer ${
                        !isCustomFee && feeAmount === d
                          ? 'bg-blue-700 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                          : 'bg-white hover:bg-blue-50 border-slate-300 text-slate-800'
                      }`}
                    >
                      {formatVND(d)}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomFee(true);
                      setFeeCustomAmount(feeAmount ? String(feeAmount) : '');
                    }}
                    className={`px-3 py-2 rounded-xl border-2 font-semibold text-xs transition-colors cursor-pointer ${
                      isCustomFee
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    Số khác
                  </button>
                </div>

                {/* Ô nhập số khác */}
                {isCustomFee && (
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="number"
                      step="10000"
                      placeholder="Nhập số tiền thu..."
                      value={feeCustomAmount}
                      onChange={(e) => setFeeCustomAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-num font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-bold text-slate-500">đ</span>
                  </div>
                )}

                {/* Bằng chữ preview */}
                <div className="text-[11px] text-slate-600 bg-blue-50 p-2 rounded-lg italic">
                  Bằng chữ:{' '}
                  <strong className="text-blue-900 not-italic">
                    {numberToVietnameseWords(
                      isCustomFee ? parseFloat(feeCustomAmount) || 0 : feeAmount
                    )}
                  </strong>
                </div>
              </div>

              {/* 4. Hình thức thanh toán */}
              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-slate-800 block text-xs">
                  Hình thức thanh toán:
                </span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  {(['TIỀN MẶT', 'TIỀN MẶT - XUẤT HÓA ĐƠN', 'CHUYỂN KHOẢN - XUẤT HÓA ĐƠN'] as const).map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFeePaymentMethod(m)}
                        className={`p-2 rounded-lg border font-semibold text-center transition-colors cursor-pointer ${
                          feePaymentMethod === m
                            ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {m === 'TIỀN MẶT'
                          ? 'Tiền mặt'
                          : m === 'TIỀN MẶT - XUẤT HÓA ĐƠN'
                          ? 'TM - Hóa đơn'
                          : 'CK - Hóa đơn'}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 5. NÚT "THU PHÍ" */}
              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBargeForFee(null)}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-extrabold text-base shadow-md shadow-blue-800/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5 text-amber-300" />
                  <span>THU PHÍ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA SÀ LAN (2 LỰA CHỌN: XÓA & BỎ QUA) */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingReceipt)}
        title="Xác nhận xóa sà lan"
        message="Bạn có chắc chắn muốn xóa dữ liệu sà lan này khỏi hệ thống cảng?"
        itemDetail={
          deletingReceipt
            ? `Biển số: ${deletingReceipt.vehiclePlate} — Chủ phương tiện: ${deletingReceipt.ownerCaptain} — Trọng tải: ${deletingReceipt.dwt} DWT`
            : undefined
        }
        onCancel={() => setDeletingReceipt(null)}
        onConfirm={() => {
          if (deletingReceipt) {
            onDeleteReceipt(deletingReceipt.id);
            setDeletingReceipt(null);
          }
        }}
      />

      {/* MODAL CHỈNH SỬA THÔNG TIN SÀ LAN */}
      {editingBarge && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                  <Pencil className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-wide">
                    Chỉnh sửa thông tin sà lan
                  </h3>
                  <p className="text-xs text-blue-200">
                    Cập nhật chi tiết thông tin phương tiện
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBarge(null)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form chỉnh sửa */}
            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4">
              {/* 1. Biển số sà lan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Biển số sà lan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: TG 13939, LA 07689..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-extrabold text-slate-900 uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* 2. Chủ phương tiện / Thuyền trưởng */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Chủ phương tiện / Thuyền trưởng
                </label>
                <input
                  type="text"
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* 3. Hai cột: Trọng tải (DWT) & Ngày cập bến */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Trọng tải (DWT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editDwt}
                    onChange={(e) => setEditDwt(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ví dụ: 1500"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 font-mono-num focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Ngày cập bến
                    </label>
                    {editDate && (
                      <span className="text-[11px] text-blue-700 font-semibold">
                        (Định dạng: {formatDateVN(editDate)})
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* 4. Tên hàng hóa */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Tên hàng hóa
                </label>
                <input
                  type="text"
                  value={editCargo}
                  onChange={(e) => setEditCargo(e.target.value)}
                  placeholder="Ví dụ: Cát, Đá 1x2, Than đá, Clinker, Container..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* 5. Ghi chú */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ghi chú thêm nếu có..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Nút hành động */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingBarge(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs shadow-md shadow-blue-700/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          3. MODAL XEM TRƯỚC VÀ GHI NHẬN TỪ FILE EXCEL
      ======================================================== */}
      {importPreviewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-700 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base uppercase tracking-wide">
                    XEM TRƯỚC VÀ GHI NHẬN TỪ FILE EXCEL
                  </h3>
                  <p className="text-xs text-emerald-200">
                    File: <strong className="text-white">{importFileName}</strong> — Tìm thấy <strong className="text-amber-300">{importPreviewData.length}</strong> sà lan hợp lệ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportPreviewData(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Thống kê nhanh từ file Excel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 font-semibold block text-[11px]">Tổng số sà lan:</span>
                  <span className="text-lg font-black text-slate-900">{importPreviewData.length} sà lan</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-emerald-700 font-semibold block text-[11px]">Đã thu phí:</span>
                  <span className="text-lg font-black text-emerald-800">
                    {importPreviewData.filter((r) => r.paymentStatus === 'paid').length} sà lan
                  </span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-amber-700 font-semibold block text-[11px]">Chưa thu phí:</span>
                  <span className="text-lg font-black text-amber-800">
                    {importPreviewData.filter((r) => r.paymentStatus !== 'paid').length} sà lan
                  </span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-blue-700 font-semibold block text-[11px]">Tổng số thu ghi nhận:</span>
                  <span className="text-lg font-black text-blue-800">
                    {formatVND(importPreviewData.reduce((s, r) => s + r.totalAmount, 0))}
                  </span>
                </div>
              </div>

              {/* Thông báo chuẩn hóa ngày DD/MM/YYYY */}
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  Định dạng ngày ghi nhận: <strong>DD/MM/YYYY</strong>. Hệ thống đã tự động nhận diện và đọc cả <strong>Ngày Cập Bến</strong> và <strong>Ngày Thu</strong> từ file Excel của bạn.
                </span>
              </div>

              {/* Bảng xem trước dữ liệu */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold sticky top-0 border-b border-slate-200 shadow-2xs z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">STT</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">BIỂN SỐ</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">CHỦ TÀU / THUYỀN TRƯỞNG</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">TRỌNG TẢI</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">HÀNG HÓA</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap bg-blue-50/80 text-blue-900">NGÀY CẬP BẾN</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap bg-emerald-50/80 text-emerald-900">NGÀY THU</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">SỐ THU</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">NGƯỜI THU</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreviewData.map((r, idx) => {
                      const isPaid = r.paymentStatus === 'paid';
                      return (
                        <tr key={r.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-bold text-slate-500 font-mono-num">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 text-center font-extrabold text-slate-900 font-mono-num whitespace-nowrap">
                            {r.vehiclePlate}
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium truncate max-w-[150px]">
                            {r.ownerCaptain}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-blue-800 whitespace-nowrap">
                            {formatDWT(r.dwt)}
                          </td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                            {r.cargoType}
                          </td>
                          {/* Ngày Cập Bến: chuẩn DD/MM/YYYY */}
                          <td className="py-2 px-3 text-center whitespace-nowrap font-medium text-slate-900 bg-blue-50/30">
                            {formatDateVN(r.date)}
                          </td>
                          {/* Ngày Thu: chuẩn DD/MM/YYYY */}
                          <td className="py-2 px-3 text-center whitespace-nowrap bg-emerald-50/30">
                            {r.collectedDate ? (
                              <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                                {formatDateVN(r.collectedDate)}
                              </span>
                            ) : isPaid ? (
                              <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                                {formatDateVN(r.date)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono-num font-bold text-emerald-800 whitespace-nowrap">
                            {r.totalAmount > 0 ? formatVND(r.totalAmount) : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                            {r.collectorName || (isPaid ? 'Nhân viên điều độ' : '—')}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {isPaid ? 'Đã thu phí' : 'Chưa thu'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tùy chọn chế độ ghi nhận: Cập nhật chống trùng lặp vs Thay thế toàn bộ */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-blue-700" />
                <span>Chọn cách ghi nhận dữ liệu (Tránh bị cộng dồn / nhân đôi số liệu cũ):</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <label
                  onClick={() => setImportMode('merge')}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'merge'
                      ? 'bg-blue-50 border-blue-500 text-blue-950 ring-1 ring-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <strong className="block font-bold text-slate-900">
                      Cập nhật & Chống cộng dồn (Khuyên dùng)
                    </strong>
                    <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                      Tự động so khớp Biển số + Ngày đến. Sà lan nào đã có thì cập nhật thông tin mới nhất, không tạo bản ghi mới trùng lặp.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setImportMode('replace')}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <strong className="block font-bold text-slate-900">
                      Thay thế toàn bộ danh sách cũ
                    </strong>
                    <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                      Xóa toàn bộ các sà lan cũ trên hệ thống và thay thế hoàn toàn bằng danh sách mới trong file Excel này.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {importMode === 'replace' ? (
                  <span className="text-amber-800 font-bold">
                    ⚠️ Sẽ thay thế toàn bộ danh sách hiện tại bằng {importPreviewData.length} sà lan từ file này.
                  </span>
                ) : (
                  <span>
                    Nhấn nút bên cạnh để cập nhật & đồng bộ <strong className="text-emerald-700 font-bold">{importPreviewData.length}</strong> sà lan vào hệ thống.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setImportPreviewData(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer text-xs"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all cursor-pointer ${
                    importMode === 'replace'
                      ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-700/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-700/20'
                  }`}
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>
                    {importMode === 'replace'
                      ? `THAY THẾ TOÀN BỘ (${importPreviewData.length} SÀ LAN)`
                      : `GHI NHẬN & CHỐNG TRÙNG (${importPreviewData.length} SÀ LAN)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
