import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  X,
  CheckCircle2,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Cloud,
  Lock,
  Plus,
} from 'lucide-react';
import { Staff, UserAccount } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface PersonnelViewProps {
  staffList: Staff[];
  onUpdateStaffList: (newStaffList: Staff[]) => void;
  accounts: UserAccount[];
  onUpdateAccounts: (newAccounts: UserAccount[]) => void;
}

export const PersonnelView: React.FC<PersonnelViewProps> = ({
  staffList,
  onUpdateStaffList,
  accounts,
  onUpdateAccounts,
}) => {
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // New staff form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Nhân viên điều độ');
  const [newPassword, setNewPassword] = useState('123456');
  const [newActive, setNewActive] = useState<boolean>(true);

  // Edit staff form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editActive, setEditActive] = useState<boolean>(true);

  // Modal xác nhận xóa nhân sự
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  // State cho quản lý mật khẩu tài khoản
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [changingPasswordAccount, setChangingPasswordAccount] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);

  // Modal tạo tài khoản mới độc lập
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccId, setNewAccId] = useState('');
  const [newAccFullName, setNewAccFullName] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('123456');
  const [newAccRole, setNewAccRole] = useState('Nhân viên điều độ');

  // Filtered staff by search term
  const filteredStaff = staffList.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      (s.role && s.role.toLowerCase().includes(term)) ||
      s.id.toLowerCase().includes(term)
    );
  });

  // Handle add staff (và tự động tạo tài khoản đăng nhập cho nhân viên đó)
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Sinh mã NV kế tiếp: NV01, NV02...
    const count = staffList.length + 1;
    const generatedId = `NV${String(count).padStart(2, '0')}`;
    const staffId = accounts.some((a) => a.id === generatedId)
      ? `NV${String(Date.now()).slice(-4)}`
      : generatedId;

    const newStaff: Staff = {
      id: staffId,
      name: newName.trim(),
      phone: '',
      shift: 'Ca 1 (06:00 - 14:00)',
      role: newRole.trim() || 'Nhân viên điều độ',
      active: newActive,
      password: newPassword.trim() || '123456',
    };

    onUpdateStaffList([...staffList, newStaff]);

    // Tạo tài khoản đăng nhập tương ứng
    const newAccount: UserAccount = {
      id: staffId,
      username: staffId,
      password: newPassword.trim() || '123456',
      fullName: newStaff.name,
      role: newStaff.role,
      staffId: staffId,
      active: newActive,
      createdAt: new Date().toISOString(),
    };
    onUpdateAccounts([...accounts, newAccount]);

    setNewName('');
    setNewRole('Nhân viên điều độ');
    setNewPassword('123456');
    setNewActive(true);
    setShowAddForm(false);
  };

  // Start edit
  const handleStartEdit = (staff: Staff) => {
    setEditingId(staff.id);
    setEditName(staff.name);
    setEditRole(staff.role || 'Nhân viên điều độ');
    setEditActive(staff.active !== false);
  };

  // Save edit
  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    const updated = staffList.map((s) =>
      s.id === id
        ? {
            ...s,
            name: editName.trim(),
            role: editRole.trim() || 'Nhân viên điều độ',
            active: editActive,
          }
        : s
    );
    onUpdateStaffList(updated);

    // Đồng bộ tên và vai trò sang accounts
    const updatedAccs = accounts.map((acc) =>
      acc.id === id || acc.staffId === id
        ? {
            ...acc,
            fullName: editName.trim(),
            role: editRole.trim() || 'Nhân viên điều độ',
            active: editActive,
          }
        : acc
    );
    onUpdateAccounts(updatedAccs);

    setEditingId(null);
  };

  // Toggle quick status (Đang làm <-> Đã nghỉ) directly on row
  const handleToggleStatus = (staff: Staff) => {
    const newStatus = !staff.active;
    const updated = staffList.map((s) =>
      s.id === staff.id ? { ...s, active: newStatus } : s
    );
    onUpdateStaffList(updated);

    // Cập nhật tình trạng trong accounts
    const updatedAccs = accounts.map((acc) =>
      acc.id === staff.id || acc.staffId === staff.id
        ? { ...acc, active: newStatus }
        : acc
    );
    onUpdateAccounts(updatedAccs);
  };

  // Xử lý đổi mật khẩu tài khoản
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPasswordAccount) return;
    if (!newPasswordInput.trim()) {
      alert('Vui lòng nhập mật khẩu mới!');
      return;
    }

    const updatedAccs = accounts.map((acc) =>
      acc.id === changingPasswordAccount.id
        ? { ...acc, password: newPasswordInput.trim() }
        : acc
    );
    onUpdateAccounts(updatedAccs);

    setPasswordSuccessMsg(`Đã đổi mật khẩu cho tài khoản "${changingPasswordAccount.username}" thành công! Dữ liệu đã lưu lên Cloud.`);
    setTimeout(() => {
      setPasswordSuccessMsg(null);
    }, 4000);

    setChangingPasswordAccount(null);
    setNewPasswordInput('');
  };

  // Xử lý tạo tài khoản mới từ modal
  const handleCreateNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newAccId.trim();
    if (!cleanId) {
      alert('Vui lòng nhập ID đăng nhập!');
      return;
    }
    if (accounts.some((a) => a.username.toLowerCase() === cleanId.toLowerCase())) {
      alert('ID tài khoản này đã tồn tại trong hệ thống!');
      return;
    }

    const newAcc: UserAccount = {
      id: cleanId,
      username: cleanId,
      password: newAccPassword.trim() || '123456',
      fullName: newAccFullName.trim() || cleanId,
      role: newAccRole.trim() || 'Nhân viên điều độ',
      active: true,
      createdAt: new Date().toISOString(),
    };

    onUpdateAccounts([...accounts, newAcc]);
    setShowAddAccountModal(false);
    setNewAccId('');
    setNewAccFullName('');
    setNewAccPassword('123456');

    setPasswordSuccessMsg(`Đã tạo tài khoản "${newAcc.username}" thành công trên đám mây!`);
    setTimeout(() => {
      setPasswordSuccessMsg(null);
    }, 4000);
  };

  const togglePasswordVisibility = (accId: string) => {
    setShowPasswordMap((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* 1. Header: QUẢN LÝ NHÂN SỰ & TÀI KHOẢN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs">
              04
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
              QUẢN LÝ NHÂN SỰ & TÀI KHOẢN ĐĂNG NHẬP
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh sách nhân viên điều độ và tài khoản ID/Mật khẩu đăng nhập đồng bộ đám mây trên mọi thiết bị
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            title={showAddForm ? 'Đóng biểu mẫu' : 'Thêm nhân sự mới'}
          >
            {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>Thêm Nhân Viên</span>
          </button>
        </div>
      </div>

      {passwordSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{passwordSuccessMsg}</span>
        </div>
      )}

      {/* Form: Thêm nhân sự mới (Khi bấm nút) */}
      {showAddForm && (
        <form
          onSubmit={handleAddStaff}
          className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border-2 border-blue-200 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-950 uppercase tracking-wide">
              <UserPlus className="w-4 h-4 text-blue-700" />
              <span>THÊM THÔNG TIN NHÂN SỰ & CẤP TÀI KHOẢN ĐĂNG NHẬP</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Tên nhân viên (Họ và tên): <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Vd: Nguyễn Văn A..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Chức vụ / Chức danh:
              </label>
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Nhân viên điều độ"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Mật khẩu đăng nhập (mặc định 123456):
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Tình trạng làm việc:
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-xs text-emerald-800">
                  <input
                    type="radio"
                    name="newStatus"
                    checked={newActive === true}
                    onChange={() => setNewActive(true)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Đang làm</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-500">
                  <input
                    type="radio"
                    name="newStatus"
                    checked={newActive === false}
                    onChange={() => setNewActive(false)}
                    className="text-slate-500 focus:ring-slate-400"
                  />
                  <span>Đã nghỉ</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
            >
              Lưu Nhân Sự & Cấp Tài Khoản
            </button>
          </div>
        </form>
      )}

      {/* ========================================================
          PHẦN 1: BẢNG DANH SÁCH NHÂN SỰ
      ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide uppercase">
                DANH SÁCH NHÂN SỰ ĐIỀU ĐỘ
              </h3>
              <p className="text-[11px] text-slate-400">
                Tổng cộng {staffList.length} nhân viên (Hiển thị người thu tiền trong phiếu thu)
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-center w-14">STT</th>
                <th className="py-3 px-4">TÊN NHÂN VIÊN</th>
                <th className="py-3 px-4">MÃ NV / ID</th>
                <th className="py-3 px-4">CHỨC VỤ / CHỨC DANH</th>
                <th className="py-3 px-4 text-center">TÌNH TRẠNG LÀM VIỆC</th>
                <th className="py-3 px-4 text-center w-28">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((st, idx) => {
                const isEditing = editingId === st.id;
                const isWorking = st.active !== false;

                if (isEditing) {
                  return (
                    <tr key={st.id} className="bg-blue-50/70">
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1.5 border border-blue-400 rounded-lg text-xs font-bold text-slate-900 bg-white"
                          placeholder="Họ và tên nhân viên"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        {st.id}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
                          placeholder="Chức vụ / Chức danh"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <label className="inline-flex items-center gap-1 cursor-pointer font-bold text-xs text-emerald-800">
                            <input
                              type="radio"
                              name={`editStatus-${st.id}`}
                              checked={editActive === true}
                              onChange={() => setEditActive(true)}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Đang làm</span>
                          </label>
                          <label className="inline-flex items-center gap-1 cursor-pointer font-bold text-xs text-slate-500">
                            <input
                              type="radio"
                              name={`editStatus-${st.id}`}
                              checked={editActive === false}
                              onChange={() => setEditActive(false)}
                              className="text-slate-500 focus:ring-slate-400"
                            />
                            <span>Đã nghỉ</span>
                          </label>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(st.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={st.id}
                    className={`transition-colors ${
                      isWorking ? 'hover:bg-slate-50' : 'bg-slate-50/60 opacity-75'
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono-num">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 ${
                            isWorking
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {st.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={isWorking ? '' : 'line-through text-slate-500'}>
                          {st.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800">
                        {st.id}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        {st.role || 'Nhân viên điều độ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`rowStatus-${st.id}`}
                            checked={isWorking}
                            onChange={() => handleToggleStatus(st)}
                            className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              isWorking
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'text-slate-400'
                            }`}
                          >
                            Đang làm
                          </span>
                        </label>
                        <span className="text-slate-300">/</span>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`rowStatus-${st.id}`}
                            checked={!isWorking}
                            onChange={() => handleToggleStatus(st)}
                            className="text-rose-500 focus:ring-rose-400 cursor-pointer"
                          />
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              !isWorking
                                ? 'bg-rose-100 text-rose-800'
                                : 'text-slate-400'
                            }`}
                          >
                            Đã nghỉ
                          </span>
                        </label>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(st)}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin nhân viên"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingStaff(st)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                          title="Xóa tên nhân viên này"
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
        </div>
      </div>

      {/* ========================================================
          PHẦN 2: BẢNG QUẢN LÝ TÀI KHOẢN ĐĂNG NHẬP & MẬT KHẨU ĐA THIẾT BỊ
      ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-wide uppercase">
                  TÀI KHOẢN ĐĂNG NHẬP (ID & MẬT KHẨU)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/40">
                  <Cloud className="w-3 h-3 text-emerald-400" />
                  <span>Đồng bộ Đám mây</span>
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                Chỉ cần có ID và Mật khẩu ở bảng này là có thể đăng nhập trên bất kỳ điện thoại, máy tính bàn, máy tính bảng nào
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddAccountModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tài Khoản</span>
          </button>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-center w-14">STT</th>
                <th className="py-3 px-4">TÀI KHOẢN (ID ĐĂNG NHẬP)</th>
                <th className="py-3 px-4">HỌ VÀ TÊN</th>
                <th className="py-3 px-4">VAI TRÒ / QUYỀN HẠN</th>
                <th className="py-3 px-4">MẬT KHẨU HIỆN TẠI</th>
                <th className="py-3 px-4 text-center w-36">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc, idx) => {
                const isShowing = Boolean(showPasswordMap[acc.id]);

                return (
                  <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400 font-mono-num">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-blue-900 text-sm">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                        <Lock className="w-3.5 h-3.5 text-blue-700" />
                        <span>{acc.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                      {acc.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        acc.role.includes('Quản trị')
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {acc.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 font-mono text-xs">
                        <span className={isShowing ? 'font-bold text-slate-900' : 'text-slate-400 tracking-wider'}>
                          {isShowing ? acc.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(acc.id)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                          title={isShowing ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {isShowing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setChangingPasswordAccount(acc);
                          setNewPasswordInput('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 font-bold border border-blue-200 transition-colors cursor-pointer"
                        title="Đổi mật khẩu cho tài khoản này"
                      >
                        <Key className="w-3.5 h-3.5 text-blue-600" />
                        <span>Đổi Mật Khẩu</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footnote on Cloud Account Sync */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Mỗi nhân viên có thể sử dụng ID và Mật khẩu trên để đăng nhập đồng thời trên nhiều điện thoại và máy tính. Mọi dữ liệu thu phí đều được lưu lại và giữ nguyên.</span>
          </div>
        </div>
      </div>

      {/* MODAL ĐỔI MẬT KHẨU TÀI KHOẢN */}
      {changingPasswordAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  ĐỔI MẬT KHẨU TÀI KHOẢN
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChangingPasswordAccount(null)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tài khoản (ID)
                </label>
                <div className="p-2.5 rounded-xl bg-slate-100 font-bold text-slate-800 text-sm font-mono flex items-center justify-between">
                  <span>{changingPasswordAccount.username}</span>
                  <span className="text-xs font-normal text-slate-500 font-sans">
                    {changingPasswordAccount.fullName}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập mật khẩu mới..."
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Mật khẩu này sẽ có hiệu lực ngay lập tức trên tất cả các thiết bị.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setChangingPasswordAccount(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
                >
                  Lưu Mật Khẩu Lên Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM TÀI KHOẢN MỚI */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  THÊM TÀI KHOẢN ĐĂNG NHẬP MỚI
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tài khoản (ID đăng nhập): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ví dụ: NV06, ĐiềuĐộ1, ThuNgân..."
                  value={newAccId}
                  onChange={(e) => setNewAccId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên nhân viên / Người sử dụng:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trần Văn C..."
                  value={newAccFullName}
                  onChange={(e) => setNewAccFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu đăng nhập: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={newAccPassword}
                  onChange={(e) => setNewAccPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vai trò:
                </label>
                <select
                  value={newAccRole}
                  onChange={(e) => setNewAccRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="Nhân viên điều độ">Nhân viên điều độ</option>
                  <option value="Quản trị viên">Quản trị viên</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA NHÂN SỰ */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingStaff)}
        title="Xác nhận xóa nhân sự"
        message="Bạn có chắc chắn muốn xóa nhân viên này khỏi danh sách nhân sự của cảng?"
        itemDetail={
          deletingStaff
            ? `Nhân viên: ${deletingStaff.name} — Chức vụ: ${deletingStaff.role || 'Nhân viên điều độ'} (Mã: ${deletingStaff.id})`
            : undefined
        }
        onCancel={() => setDeletingStaff(null)}
        onConfirm={() => {
          if (deletingStaff) {
            if (staffList.length <= 1) {
              alert('Hệ thống phải có ít nhất 1 nhân sự!');
              setDeletingStaff(null);
              return;
            }
            onUpdateStaffList(staffList.filter((s) => s.id !== deletingStaff.id));
            if (editingId === deletingStaff.id) {
              setEditingId(null);
            }
            setDeletingStaff(null);
          }
        }}
      />
    </div>
  );
};
