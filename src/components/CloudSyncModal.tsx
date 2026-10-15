import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  Database,
  Server,
  ShieldCheck,
  X,
  FileSpreadsheet,
  Users,
  Settings2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { cloudInfo } from '../firebase';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCloudConnected: boolean;
  receiptsCount: number;
  staffCount: number;
  onForceSyncAll: () => Promise<void>;
  onReloadFromCloud?: () => Promise<void>;
  onDeduplicate?: () => Promise<number>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  isCloudConnected,
  receiptsCount,
  staffCount,
  onForceSyncAll,
  onReloadFromCloud,
  onDeduplicate,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      await onForceSyncAll();
      setSyncSuccessMsg('Đã lưu dữ liệu lên máy chủ Google Cloud thành công!');
    } catch {
      setSyncSuccessMsg('Lỗi đồng bộ. Vui lòng kiểm tra lại kết nối mạng!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReloadNow = async () => {
    if (!onReloadFromCloud) return;
    setIsReloading(true);
    setSyncSuccessMsg(null);
    try {
      await onReloadFromCloud();
      setSyncSuccessMsg('Đã tải lại toàn bộ dữ liệu mới nhất từ máy chủ Google Cloud thành công!');
    } catch {
      setSyncSuccessMsg('Lỗi khi tải từ đám mây. Vui lòng kiểm tra kết nối mạng!');
    } finally {
      setIsReloading(false);
    }
  };

  const handleDeduplicateNow = async () => {
    if (!onDeduplicate) return;
    setIsDeduplicating(true);
    setSyncSuccessMsg(null);
    try {
      const remainingCount = await onDeduplicate();
      setSyncSuccessMsg(`Đã lọc sạch trùng lặp thành công! Danh sách hiện có ${remainingCount} sà lan duy nhất.`);
    } catch {
      setSyncSuccessMsg('Lỗi khi lọc trùng lặp.');
    } finally {
      setIsDeduplicating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/80 border border-blue-400/40 flex items-center justify-center shadow-md">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                CƠ SỞ DỮ LIỆU ĐÁM MÂY
              </h2>
              <p className="text-xs text-blue-200">
                Google Cloud Firestore (Đồng bộ trực tuyến thời gian thực)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isCloudConnected
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 flex-shrink-0">
                {isCloudConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                    isCloudConnected ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                ></span>
              </span>
              <div>
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  {isCloudConnected ? 'KẾT NỐI ĐÁM MÂY HOẠT ĐỘNG' : 'ĐANG KẾT NỐI ĐÁM MÂY...'}
                  {isCloudConnected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {isCloudConnected
                    ? 'Dữ liệu được lưu tự động trên máy chủ Google Cloud.'
                    : 'Đang kiểm tra kết nối tới máy chủ Google...'}
                </div>
              </div>
            </div>
          </div>

          {syncSuccessMsg && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Cloud Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
              <FileSpreadsheet className="w-5 h-5 mx-auto text-blue-600 mb-1" />
              <div className="font-bold text-slate-500 text-[10px] uppercase">Phiếu sà lan</div>
              <div className="text-lg font-black text-slate-800 font-mono-num">{receiptsCount}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
              <Users className="w-5 h-5 mx-auto text-indigo-600 mb-1" />
              <div className="font-bold text-slate-500 text-[10px] uppercase">Nhân sự</div>
              <div className="text-lg font-black text-slate-800 font-mono-num">{staffCount}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
              <Settings2 className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <div className="font-bold text-slate-500 text-[10px] uppercase">Cấu hình cảng</div>
              <div className="text-xs font-extrabold text-emerald-700 mt-1">Đã đồng bộ</div>
            </div>
          </div>

          {/* Technical Info */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Server className="w-4 h-4 text-slate-500" />
              <span>THÔNG SỐ MÁY CHỦ GOOGLE CLOUD</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Nền tảng máy chủ:</span>
              <span className="font-semibold text-slate-800">Google Cloud Platform (Firestore)</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Mã dự án (Project ID):</span>
              <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                {cloudInfo.projectId || 'helpful-cascade-grrhs'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Cơ chế đồng bộ:</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Tự động hai chiều (Realtime WebSocket)
              </span>
            </div>
          </div>

          {/* Benefits Info Box */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 text-blue-900 space-y-1.5">
            <div className="font-bold text-xs flex items-center gap-1.5 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Dữ liệu của bạn được bảo vệ như thế nào?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800 leading-relaxed">
              <li>Mỗi khi bạn thêm, sửa, nộp tiền hoặc xóa sà lan, hệ thống lưu ngay lập tức lên Google Cloud.</li>
              <li>Nhiều nhân viên có thể mở ứng dụng trên điện thoại, máy tính cùng lúc và thấy dữ liệu cập nhật tức thì.</li>
              <li>Dù cài lại máy tính hay đổi trình duyệt, toàn bộ dữ liệu vẫn nguyên vẹn 100%.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onReloadFromCloud && (
              <button
                type="button"
                disabled={isReloading || isSyncing || isDeduplicating}
                onClick={handleReloadNow}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                title="Tải lại toàn bộ dữ liệu mới nhất từ máy chủ Google Cloud về thiết bị này"
              >
                <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
                <span>{isReloading ? 'Đang tải về...' : 'TẢI LẠI TỪ ĐÁM MÂY'}</span>
              </button>
            )}

            {onDeduplicate && (
              <button
                type="button"
                disabled={isDeduplicating || isSyncing || isReloading}
                onClick={handleDeduplicateNow}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                title="Quét và xóa bỏ các sà lan bị trùng lặp trên hệ thống"
              >
                <Sparkles className={`w-4 h-4 ${isDeduplicating ? 'animate-spin' : ''}`} />
                <span>{isDeduplicating ? 'Đang lọc...' : 'LỌC TRÙNG LẶP'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSyncing || isReloading || isDeduplicating}
              onClick={handleSyncNow}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
              title="Gửi toàn bộ dữ liệu hiện tại lên máy chủ Google Cloud"
            >
              <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
              <span>{isSyncing ? 'Đang gửi...' : 'ĐỒNG BỘ LÊN ĐÁM MÂY'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
