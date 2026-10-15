import React, { useState } from 'react';
import { X, UserPlus, Users, Edit2, Trash2, Check, UserCheck, Shield } from 'lucide-react';
import { Staff, ShiftType } from '../types';

interface StaffModalProps {
  staffList: Staff[];
  onClose: () => void;
  onUpdateStaffList: (newStaffList: Staff[]) => void;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  staffList,
  onClose,
  onUpdateStaffList,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Staff State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newShift, setNewShift] = useState<ShiftType>('Ca 1 (06:00 - 14:00)');
  const [newRole, setNewRole] = useState('Nhân viên thu phí');

  // Edit Staff State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editShift, setEditShift] = useState<ShiftType>('Ca 1 (06:00 - 14:00)');
  const [editRole, setEditRole] = useState('');

  // Handle Add Staff
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newStaff: Staff = {
      id: `NV${String(Date.now()).slice(-4)}`,
      name: newName.trim(),
      phone: newPhone.trim() || '0900.000.000',
      shift: newShift,
      role: newRole.trim() || 'Nhân viên thu phí',
      active: true,
    };

    onUpdateStaffList([...staffList, newStaff]);
    setNewName('');
    setNewPhone('');
  };

  // Start editing
  const handleStartEdit = (staff: Staff) => {
    setEditingId(staff.id);
    setEditName(staff.name);
    setEditPhone(staff.phone);
    setEditShift(staff.shift);
    setEditRole(staff.role);
  };

  // Save edit
  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    const updated = staffList.map((s) =>
      s.id === id
        ? {
            ...s,
            name: editName.trim(),
            phone: editPhone.trim(),
            shift: editShift,
            role: editRole.trim(),
          }
        : s
    );
    onUpdateStaffList(updated);
    setEditingId(null);
  };

  // Delete staff
  const handleDeleteStaff = (id: string) => {
    if (staffList.length <= 1) {
      alert('Hệ thống phải có ít nhất 1 nhân viên thu ngân!');
      return;
    }
    if (confirm('Bạn có chắc muốn xóa nhân viên này khỏi danh mục?')) {
      onUpdateStaffList(staffList.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-base">Quản Lý Nhân Sự Thu Phí</h3>
              <p className="text-xs text-blue-200">
                Thêm, sửa, xóa nhân viên trực ca và thu phí tại Cảng Thạnh Phước
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6">
          {/* Section 1: Thêm Nhân Viên Mới */}
          <form
            onSubmit={handleAddStaff}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>THÊM NHÂN VIÊN THU MỚI</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Họ và tên nhân viên:</label>
                <input
                  type="text"
                  required
                  placeholder="Vd: Nguyễn Văn Tuấn..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Số điện thoại liên hệ:</label>
                <input
                  type="text"
                  placeholder="0912.xxx.xxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Ca trực chính:</label>
                <select
                  value={newShift}
                  onChange={(e) => setNewShift(e.target.value as ShiftType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  <option value="Ca 1 (06:00 - 14:00)">Ca 1 (06:00 - 14:00)</option>
                  <option value="Ca 2 (14:00 - 22:00)">Ca 2 (14:00 - 22:00)</option>
                  <option value="Ca 3 (22:00 - 06:00)">Ca 3 (22:00 - 06:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Chức vụ / Vị trí:</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                + Thêm Nhân Viên
              </button>
            </div>
          </form>

          {/* Section 2: Danh Sách Nhân Viên Hiện Tại */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Danh Sách Nhân Viên Hiện Có ({staffList.length} người)
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
              {staffList.map((st) => (
                <div key={st.id} className="p-3 text-xs hover:bg-slate-50 transition-colors">
                  {editingId === st.id ? (
                    // Edit Form
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 border rounded text-xs"
                          placeholder="Họ tên"
                        />
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="px-2 py-1 border rounded text-xs"
                          placeholder="Điện thoại"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={editShift}
                          onChange={(e) => setEditShift(e.target.value as ShiftType)}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value="Ca 1 (06:00 - 14:00)">Ca 1 (06:00 - 14:00)</option>
                          <option value="Ca 2 (14:00 - 22:00)">Ca 2 (14:00 - 22:00)</option>
                          <option value="Ca 3 (22:00 - 06:00)">Ca 3 (22:00 - 06:00)</option>
                        </select>
                        <input
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="px-2 py-1 border rounded text-xs"
                          placeholder="Chức vụ"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(st.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal View
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>{st.name}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-normal">
                            {st.role}
                          </span>
                        </div>
                        <div className="text-slate-500">
                          {st.shift.split(' ')[0]} · ĐT: {st.phone}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(st)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(st.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                          title="Xóa nhân viên"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
          >
            Hoàn Tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
