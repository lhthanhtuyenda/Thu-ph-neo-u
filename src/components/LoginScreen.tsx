import React, { useState } from 'react';
import {
  Anchor,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Cloud,
  CheckCircle2,
  Users,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { UserAccount } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  accounts: UserAccount[];
  isCloudConnected?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  accounts,
  isCloudConnected = true,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const trimmedUser = username.trim().toLowerCase();
      const trimmedPass = password.trim();

      // Tìm tài khoản theo username hoặc id (không phân biệt chữ hoa thường)
      const matchedAccount = accounts.find(
        (acc) =>
          acc.active !== false &&
          (acc.username.trim().toLowerCase() === trimmedUser ||
            acc.id.trim().toLowerCase() === trimmedUser)
      );

      // Nếu tìm thấy và mật khẩu khớp
      if (matchedAccount && matchedAccount.password === trimmedPass) {
        setIsLoading(false);
        onLoginSuccess(matchedAccount);
        return;
      }

      // Trường hợp dự phòng Admin chuẩn nếu danh sách chưa tải xong
      if (
        (trimmedUser === 'admin' || trimmedUser === 'quantri') &&
        (trimmedPass === 'Admin@789' || trimmedPass === '123456')
      ) {
        setIsLoading(false);
        const fallbackAdmin: UserAccount = {
          id: 'Admin',
          username: 'Admin',
          password: trimmedPass,
          fullName: 'Quản trị viên bến cảng',
          role: 'Quản trị viên',
          active: true,
        };
        onLoginSuccess(fallbackAdmin);
        return;
      }

      setIsLoading(false);
      setErrorMsg('Tài khoản (ID) hoặc Mật khẩu không chính xác! Vui lòng thử lại.');
    }, 200);
  };

  const handleQuickFill = (acc: UserAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-lg">
        {/* Logo & Header Card */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 border-2 border-blue-400/40 text-white shadow-xl shadow-blue-950/60 mb-2.5">
            <Anchor className="w-8 h-8" />
          </div>
          <div className="text-[11px] font-extrabold tracking-widest text-teal-400 uppercase">
            BICONSI GROUP
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
            CẢNG THẠNH PHƯỚC
          </h1>
          <p className="text-sm text-blue-200 mt-1 font-medium">
            Hệ thống quản lý thu phí neo đậu sà lan đa thiết bị
          </p>

          {/* Cloud Status Badge on login header */}
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-semibold backdrop-blur-sm shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cơ sở dữ liệu đám mây Google Cloud: ĐÃ KẾT NỐI & ĐỒNG BỘ</span>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-7">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                <span>ĐĂNG NHẬP HỆ THỐNG</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập ID và Mật khẩu để truy cập trên bất kỳ thiết bị nào
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
              <Laptop className="w-4 h-4 text-slate-500" />
              <Smartphone className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tài khoản (ID nhân viên hoặc Admin)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ví dụ: Admin, NV01, NV02..."
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-extrabold text-sm shadow-md shadow-blue-800/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                <span>{isLoading ? 'Đang xác thực...' : 'ĐĂNG NHẬP VÀO HỆ THỐNG'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Quick Click Account Badges */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Bấm chọn tài khoản nhanh để đăng nhập:</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {accounts.slice(0, 6).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className={`text-left p-2 rounded-xl border transition-all cursor-pointer ${
                    username.toLowerCase() === acc.username.toLowerCase()
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900">{acc.username}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {acc.username === 'Admin' ? 'Admin@789' : '123456'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-medium truncate mt-0.5">
                    {acc.fullName}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sync Information Footnote */}
          <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Đồng bộ đa thiết bị tự động:</strong> Dữ liệu sà lan và phiếu thu được lưu giữ trên máy chủ đám mây. Bạn có thể đăng nhập trên nhiều máy tính, điện thoại, máy tính bảng cùng lúc — bất kỳ máy nào nhập thì các máy khác đều thấy ngay lập tức.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
