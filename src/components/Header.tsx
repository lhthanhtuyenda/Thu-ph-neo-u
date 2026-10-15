import React, { useState, useEffect } from 'react';
import { Anchor, Clock, Settings, RefreshCw, LogOut, UserCheck, Cloud } from 'lucide-react';
import { PortConfig, ReceiptRecord, UserAccount } from '../types';

interface HeaderProps {
  config: PortConfig;
  receipts: ReceiptRecord[];
  currentUser?: UserAccount | null;
  isCloudConnected?: boolean;
  onOpenCloudModal?: () => void;
  onOpenSettings: () => void;
  onResetSampleData: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  receipts,
  currentUser,
  isCloudConnected = true,
  onOpenCloudModal,
  onOpenSettings,
  onResetSampleData,
  onLogout,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      setCurrentDate(`${weekdays[now.getDay()]}, ${day}/${month}/${year}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white shadow-lg border-b border-blue-800/60">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Port Identity */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-blue-600/90 border border-blue-400/40 flex items-center justify-center shadow-md shadow-blue-950/50">
              <Anchor className="w-7 h-7 text-white" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest text-teal-400 uppercase">
                  BICONSI GROUP
                </span>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-white leading-tight">
                CẢNG THẠNH PHƯỚC
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 font-medium">
                Thu phí neo đậu sà lan
              </p>
            </div>
          </div>

          {/* Right Meta & Live Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between md:justify-end">
            {/* Live Clock & Shift */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
              <div>
                <div className="font-mono-num font-bold text-white text-sm leading-none">
                  {currentTime || '08:00:00'}
                </div>
                <div className="text-[10px] text-blue-200 capitalize mt-0.5">
                  {currentDate}
                </div>
              </div>
            </div>

            {/* Cloud Sync Status (Clickable to view detailed Cloud info) */}
            <button
              type="button"
              onClick={onOpenCloudModal}
              className={`cursor-pointer rounded-lg px-2.5 py-1.5 border flex items-center gap-1.5 text-xs transition-all shadow-sm ${
                isCloudConnected
                  ? 'bg-emerald-500/25 hover:bg-emerald-500/35 border-emerald-400/50 text-emerald-200 hover:text-white'
                  : 'bg-amber-500/25 hover:bg-amber-500/35 border-amber-400/50 text-amber-200 hover:text-white'
              }`}
              title="Nhấp để xem chi tiết kết nối Cơ sở dữ liệu đám mây Google Cloud"
            >
              <span className="relative flex h-2.5 w-2.5">
                {isCloudConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isCloudConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                ></span>
              </span>
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-[11px] whitespace-nowrap">
                {isCloudConnected ? 'Đám mây: Đã kết nối' : 'Đang kết nối...'}
              </span>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenSettings}
                title="Cài đặt thông tin bến cảng & mệnh giá số thu"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Settings className="w-4 h-4 text-blue-200" />
                <span className="hidden lg:inline">Cài Đặt</span>
              </button>

              <button
                type="button"
                onClick={onResetSampleData}
                title="Tải lại dữ liệu mẫu"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-slate-300" />
                <span className="hidden lg:inline">Dữ Liệu Mẫu</span>
              </button>

              {onLogout && (
                <div className="flex items-center gap-1.5 pl-1 border-l border-white/15">
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                    <UserCheck className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                    <span className="truncate max-w-[140px]" title={currentUser ? `${currentUser.fullName} (${currentUser.username})` : 'Đã đăng nhập'}>
                      {currentUser ? `${currentUser.username} - ${currentUser.fullName}` : 'Admin'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Đăng xuất khỏi thiết bị này"
                    className="p-2 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white transition-all border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Đăng Xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
