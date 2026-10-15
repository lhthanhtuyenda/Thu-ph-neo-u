import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { ReceiptRecord, PortConfig } from '../types';
import { formatVND, formatDWT, numberToVietnameseWords } from '../utils/numberToWords';
import { formatDateVN } from '../utils/dateHelpers';

interface ThermalReceiptModalProps {
  receipt: ReceiptRecord | null;
  config: PortConfig;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  receipt,
  config,
  onClose,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!receipt) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
        {/* Header Modal Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Xem Trước & In Hóa Đơn Nhiệt
              </h3>
              <p className="text-[11px] text-slate-300">
                Khổ giấy tiêu chuẩn máy in nhiệt K80 (80mm) & K58 (58mm)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size Selector */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Khổ giấy in nhiệt:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                paperWidth === '80mm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              K80 (80mm - Tiêu Chuẩn)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                paperWidth === '58mm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              K58 (58mm - Thu Nhỏ)
            </button>
          </div>
        </div>

        {/* Thermal Receipt Simulation Paper Body */}
        <div className="p-6 bg-slate-200/60 flex justify-center overflow-x-auto">
          <div
            id="printable-receipt"
            style={{ width: paperWidth === '80mm' ? '320px' : '260px' }}
            className="bg-white p-5 shadow-lg border border-slate-300 font-mono text-[11px] leading-relaxed text-slate-900 rounded-xs select-none"
          >
            {/* Port & Company Logo Info */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <div className="font-extrabold text-[12px] uppercase tracking-wider text-slate-900">
                BICONSI GROUP
              </div>
              <div className="font-bold text-[13px] uppercase tracking-tight mt-0.5 text-slate-950">
                {config.portName}
              </div>
              <div className="text-[10px] text-slate-600 mt-1 leading-tight">
                {config.address}
              </div>
              <div className="text-[10px] text-slate-600">
                Hotline: {config.hotline.split('-')[0]}
              </div>
            </div>

            {/* Receipt Title */}
            <div className="text-center mb-3">
              <div className="font-extrabold text-[14px] uppercase tracking-wide">
                BIÊN LAI THU PHÍ
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-600">
                NEO ĐẬU PHƯƠNG TIỆN THỦY
              </div>
              <div className="text-[10px] mt-1 text-slate-700">
                Số: <strong>{receipt.id}</strong>
              </div>
            </div>

            {/* Date info */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Ngày cập bến:</span>
                <span className="font-bold">{formatDateVN(receipt.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ngày thu:</span>
                <span className="font-bold">{formatDateVN(receipt.collectedDate || receipt.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Người thu:</span>
                <span className="font-bold">{receipt.collectorName}</span>
              </div>
            </div>

            {/* Barge Details Table */}
            <div className="space-y-1.5 py-1 border-b border-dashed border-slate-400 pb-2 mb-2">
              <div className="text-center py-1 bg-slate-100 rounded">
                <div className="text-[10px] text-slate-500 uppercase">Biển số sà lan</div>
                <div className="text-[16px] font-black tracking-wider text-slate-950">
                  {receipt.vehiclePlate}
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Thuyền trưởng:</span>
                <span className="font-semibold text-right max-w-[170px] truncate">
                  {receipt.ownerCaptain}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Hàng hóa:</span>
                <span className="font-semibold">{receipt.cargoType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Trọng tải (DWT):</span>
                <span className="font-bold">{formatDWT(receipt.dwt)}</span>
              </div>
            </div>

            {/* Total Amount Box */}
            <div className="border-b-2 border-slate-800 pb-2 mb-2">
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-extrabold uppercase text-[12px]">SỐ THU:</span>
                <span className="font-black text-[17px] text-slate-950">
                  {formatVND(receipt.totalAmount)}
                </span>
              </div>
              <div className="text-[10px] italic text-slate-700 leading-tight mt-1">
                (Bằng chữ: {numberToVietnameseWords(receipt.totalAmount)})
              </div>
              <div className="flex justify-between text-[10px] mt-2 pt-1 border-t border-slate-200">
                <span className="font-semibold">Hình thức:</span>
                <span className="font-bold uppercase text-slate-900">
                  {receipt.paymentMethod}
                </span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center text-[9px] text-slate-500 space-y-0.5 pt-2">
              <div>Xin cảm ơn Quý thuyền trưởng!</div>
              <div>Chúc hành trình thuận buồm xuôi gió!</div>
              <div className="text-[8px] pt-1">Hệ Thống Thu Phí Cảng Thạnh Phước</div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
          >
            Đóng Lại
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>IN HÓA ĐƠN NHIỆT (K80 / K58)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
