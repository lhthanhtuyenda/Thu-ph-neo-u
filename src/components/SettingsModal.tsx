import React, { useState } from 'react';
import { X, Settings, Building, Save, CheckCircle, Layers, Plus, Trash2 } from 'lucide-react';
import { PortConfig } from '../types';
import { formatVND } from '../utils/numberToWords';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface SettingsModalProps {
  config: PortConfig;
  onClose: () => void;
  onSaveConfig: (newConfig: PortConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onClose,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<PortConfig>({ ...config });
  const [newDenom, setNewDenom] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deletingDenom, setDeletingDenom] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleAddDenom = () => {
    const val = parseFloat(newDenom);
    if (!val || val <= 0) return;
    if (!formData.denominations.includes(val)) {
      setFormData({
        ...formData,
        denominations: [...formData.denominations, val].sort((a, b) => a - b),
      });
    }
    setNewDenom('');
  };

  const handleRemoveDenom = (denom: number) => {
    if (formData.denominations.length <= 1) {
      alert('Phải có ít nhất 1 mệnh giá số thu!');
      return;
    }
    setFormData({
      ...formData,
      denominations: formData.denominations.filter((d) => d !== denom),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-base">Cài Đặt Hệ Thống Bến Cảng</h3>
              <p className="text-xs text-slate-300">
                Thông tin Cảng Thạnh Phước (Biconsi) & Mệnh giá số thu
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Đã lưu cài đặt bến cảng thành công!</span>
            </div>
          )}

          {/* 1. Mệnh giá Số Thu */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-blue-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-700" />
                Danh Sách Mệnh Giá Số Thu Hiện Hành:
              </label>
              <span className="text-[11px] text-blue-700">Mặc định: 200k, 400k, 600k</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {formData.denominations.map((denom) => (
                <span
                  key={denom}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-300 rounded-lg font-mono-num font-bold text-slate-800 text-xs shadow-xs"
                >
                  <span>{formatVND(denom)}</span>
                  <button
                    type="button"
                    onClick={() => setDeletingDenom(denom)}
                    title="Xóa mệnh giá"
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                step="10000"
                placeholder="Nhập mệnh giá mới (vd: 800000)..."
                value={newDenom}
                onChange={(e) => setNewDenom(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono-num text-xs w-48"
              />
              <button
                type="button"
                onClick={handleAddDenom}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mệnh Giá</span>
              </button>
            </div>
          </div>

          {/* 2. Thông tin Đơn Vị & Cảng */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-teal-600" />
              Thông Tin Bến Cảng & Doanh Nghiệp (In trên biên lai nhiệt)
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Tên Cảng / Chi Nhánh:</label>
              <input
                type="text"
                value={formData.portName}
                onChange={(e) => setFormData({ ...formData, portName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Công Ty Chủ Quản:</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Địa Chỉ Bến Cảng:</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Mã Số Thuế:</label>
              <input
                type="text"
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Điện Thoại & Fax:</label>
              <input
                type="text"
                value={formData.hotline}
                onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>

            {/* Cấu hình Webhook URL Google Sheets */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-slate-800 font-bold mb-1">
                Google Sheets Webhook URL (Tự động ghi từ dòng B9):
              </label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={formData.googleSheetsWebhookUrl || ''}
                onChange={(e) => setFormData({ ...formData, googleSheetsWebhookUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Dán URL Web App tạo từ Google Sheets vào đây. Khi bấm <strong>THU PHÍ</strong>, dữ liệu sẽ tự động bắn vào Sheet đích.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cài Đặt</span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL XÁC NHẬN XÓA MỆNH GIÁ (2 LỰA CHỌN: XÓA & BỎ QUA) */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingDenom !== null)}
        title="Xác nhận xóa mệnh giá"
        message="Bạn có chắc chắn muốn xóa mệnh giá này khỏi danh sách mệnh giá thu tiền?"
        itemDetail={deletingDenom !== null ? `Mệnh giá: ${formatVND(deletingDenom)}` : undefined}
        onCancel={() => setDeletingDenom(null)}
        onConfirm={() => {
          if (deletingDenom !== null) {
            handleRemoveDenom(deletingDenom);
            setDeletingDenom(null);
          }
        }}
      />
    </div>
  );
};
