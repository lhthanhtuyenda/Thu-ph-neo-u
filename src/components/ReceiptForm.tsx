import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Ship,
  User,
  Scale,
  Package,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ReceiptRecord,
  PortConfig,
  UserAccount,
} from '../types';
import {
  formatDWT,
} from '../utils/numberToWords';
import {
  generateReceiptId,
  getKnownBarges,
  recordKnownBarge,
  getKnownCargos,
  recordKnownCargo,
} from '../utils/storage';
import { formatDateVN, getTodayDateStr } from '../utils/dateHelpers';

interface ReceiptFormProps {
  config: PortConfig;
  existingReceipts: ReceiptRecord[];
  currentUser?: UserAccount | null;
  onSaveReceipt: (receipt: ReceiptRecord) => void;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  config,
  existingReceipts,
  currentUser,
  onSaveReceipt,
}) => {
  // 1. Ngày cập bến
  const [date, setDate] = useState<string>(getTodayDateStr());

  // 2. Phương tiện (Biển số hoặc tên sà lan)
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [showPlateDropdown, setShowPlateDropdown] = useState<boolean>(false);
  const plateContainerRef = useRef<HTMLDivElement>(null);

  // 3. Chủ phương tiện / Thuyền trưởng
  const [ownerCaptain, setOwnerCaptain] = useState<string>('');

  // 4. Trọng tải
  const [dwt, setDwt] = useState<number | ''>('');

  // 5. Tên hàng hóa
  const [cargoType, setCargoType] = useState<string>('');
  const [showCargoDropdown, setShowCargoDropdown] = useState<boolean>(false);
  const cargoContainerRef = useRef<HTMLDivElement>(null);

  // Ghi chú (tùy chọn)
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Barges & Cargos dynamic lists
  const [knownBarges, setKnownBarges] = useState<string[]>(() => getKnownBarges());
  const [knownCargos, setKnownCargos] = useState<string[]>(() => getKnownCargos());

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        plateContainerRef.current &&
        !plateContainerRef.current.contains(event.target as Node)
      ) {
        setShowPlateDropdown(false);
      }
      if (
        cargoContainerRef.current &&
        !cargoContainerRef.current.contains(event.target as Node)
      ) {
        setShowCargoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter barges based on input (e.g. typing "TG" shows all TG barges)
  const filteredBarges = useMemo(() => {
    if (!vehiclePlate.trim()) {
      return knownBarges.slice(0, 10);
    }
    const q = vehiclePlate.toUpperCase().trim();
    return knownBarges.filter((b) => b.toUpperCase().includes(q));
  }, [vehiclePlate, knownBarges]);

  // Filter cargos based on input (e.g. typing "v" shows "Viên nén", "Viên nén gỗ")
  const filteredCargos = useMemo(() => {
    if (!cargoType.trim()) {
      return knownCargos.slice(0, 10);
    }
    const q = cargoType.toLowerCase().trim();
    return knownCargos.filter((c) => c.toLowerCase().includes(q));
  }, [cargoType, knownCargos]);

  // Receipt ID preview
  const currentReceiptId = useMemo(() => {
    return generateReceiptId(date, existingReceipts);
  }, [date, existingReceipts]);

  // Submit handler: LƯU
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!vehiclePlate.trim()) {
      alert('Vui lòng nhập Biển số hoặc Tên sà lan!');
      return;
    }
    if (!dwt || dwt <= 0) {
      alert('Vui lòng nhập Trọng tải (DWT) hợp lệ lớn hơn 0!');
      return;
    }

    const newReceipt: ReceiptRecord = {
      id: currentReceiptId,
      date,
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      ownerCaptain: ownerCaptain.trim() || 'Chủ phương tiện',
      dwt: typeof dwt === 'number' ? dwt : 0,
      cargoType: cargoType.trim() || 'Hàng tổng hợp',
      collectorName: currentUser?.fullName || 'Cảng Vụ',
      totalAmount: 0,
      paymentMethod: 'TIỀN MẶT',
      berthStatus: 'docked',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    // Auto-save plate & cargo to master lists
    recordKnownBarge(newReceipt.vehiclePlate);
    setKnownBarges(getKnownBarges());

    recordKnownCargo(newReceipt.cargoType);
    setKnownCargos(getKnownCargos());

    onSaveReceipt(newReceipt);

    // Fire celebratory confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#1E3A8A', '#0D9488', '#F59E0B'],
      });
    } catch {
      // ignore
    }

    setSaveSuccessMsg(`Đã lưu thông tin sà lan ${newReceipt.vehiclePlate} thành công!`);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);

    // Reset inputs for next entry
    setVehiclePlate('');
    setOwnerCaptain('');
    setDwt('');
    setCargoType('');
    setNotes('');
  };

  // Reset form
  const handleResetForm = () => {
    setDate(getTodayDateStr());
    setVehiclePlate('');
    setOwnerCaptain('');
    setDwt('');
    setCargoType('');
    setNotes('');
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* 1. Header Title: "Thông tin sà lan" */}
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Thông tin sà lan
        </h2>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">{saveSuccessMsg}</p>
              <p className="text-xs text-emerald-700">Dữ liệu đã được lưu trữ an toàn trong hệ thống cảng.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 underline font-medium cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7 space-y-6"
      >
        {/* ========================================================
            1. NGÀY CẬP BẾN
        ======================================================== */}
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Ngày cập bến</span>
              <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setDate(getTodayDateStr())}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hôm nay</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-72 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Định dạng ngày:</span>
              <strong className="text-blue-800 font-extrabold text-sm">{formatDateVN(date)}</strong>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. PHƯƠNG TIỆN
        ======================================================== */}
        <div
          ref={plateContainerRef}
          className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:border-blue-300 transition-colors relative"
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                2
              </span>
              <Ship className="w-4 h-4 text-blue-600" />
              <span>Phương tiện</span>
              <span className="text-rose-500">*</span>
            </label>
          </div>

          <div className="relative">
            <input
              type="text"
              required
              placeholder="Nhập biển số hoặc tên sà lan..."
              value={vehiclePlate}
              onChange={(e) => {
                setVehiclePlate(e.target.value.toUpperCase());
                setShowPlateDropdown(true);
              }}
              onFocus={() => setShowPlateDropdown(true)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 text-base placeholder:normal-case placeholder:font-normal"
            />

            {/* Dropdown Auto-suggest when typing */}
            {showPlateDropdown && filteredBarges.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 sticky top-0 flex justify-between items-center">
                  <span>GỢI Ý CÁC SÀ LAN ĐÃ NHẬP ({filteredBarges.length}):</span>
                  <span>Nhấn để chọn</span>
                </div>
                {filteredBarges.map((plate) => (
                  <button
                    key={plate}
                    type="button"
                    onClick={() => {
                      setVehiclePlate(plate);
                      setShowPlateDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs sm:text-sm font-bold text-slate-800 hover:text-blue-700 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Ship className="w-3.5 h-3.5 text-blue-600" />
                      {plate}
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">Chọn sà lan này</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick chips of recent barges */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Gợi ý nhanh:
            </span>
            {knownBarges.slice(0, 6).map((plate) => (
              <button
                key={plate}
                type="button"
                onClick={() => setVehiclePlate(plate)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                  vehiclePlate === plate
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                <strong>{plate}</strong>
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================
            3. CHỦ PHƯƠNG TIỆN / THUYỀN TRƯỞNG
        ======================================================== */}
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:border-blue-300 transition-colors">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
              3
            </span>
            <User className="w-4 h-4 text-blue-600" />
            <span>Chủ phương tiện / Thuyền trưởng</span>
          </label>
          <input
            type="text"
            placeholder="Nhập tên thuyền trưởng hoặc chủ phương tiện..."
            value={ownerCaptain}
            onChange={(e) => setOwnerCaptain(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* ========================================================
            4. TRỌNG TẢI
        ======================================================== */}
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                4
              </span>
              <Scale className="w-4 h-4 text-blue-600" />
              <span>Trọng tải</span>
              <span className="text-rose-500">*</span>
              <span className="text-slate-400 font-normal text-xs">(Đơn vị: Tấn)</span>
            </label>
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-md">
              {typeof dwt === 'number' && dwt > 0 ? formatDWT(dwt) : '0 tấn'}
            </span>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Scale className="w-5 h-5 text-blue-600" />
            </div>
            <input
              type="number"
              min="1"
              max="50000"
              step="1"
              required
              placeholder="Nhập số tấn trọng tải (DWT)..."
              value={dwt}
              onChange={(e) => {
                const val = e.target.value;
                setDwt(val === '' ? '' : Math.max(0, parseFloat(val)));
              }}
              className="w-full pl-11 pr-16 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold font-mono-num text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
              TẤN (DWT)
            </div>
          </div>
        </div>

        {/* ========================================================
            5. TÊN HÀNG HÓA
        ======================================================== */}
        <div
          ref={cargoContainerRef}
          className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:border-blue-300 transition-colors relative"
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                5
              </span>
              <Package className="w-4 h-4 text-blue-600" />
              <span>Tên hàng hóa</span>
              <span className="text-rose-500">*</span>
            </label>
          </div>

          <div className="relative mb-2.5">
            <input
              type="text"
              required
              placeholder="Nhập tên hàng hóa (Viên nén, Phân đạm, Than đá, Sắt cây, Đá...)..."
              value={cargoType}
              onChange={(e) => {
                setCargoType(e.target.value);
                setShowCargoDropdown(true);
              }}
              onFocus={() => setShowCargoDropdown(true)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />

            {/* Dropdown Auto-suggest for Cargo */}
            {showCargoDropdown && filteredCargos.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-xl shadow-xl border border-slate-200 max-h-52 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 sticky top-0 flex justify-between items-center">
                  <span>GỢI Ý TÊN HÀNG HÓA ĐÃ NHẬP:</span>
                  <span>Nhấn để chọn</span>
                </div>
                {filteredCargos.map((cargo) => (
                  <button
                    key={cargo}
                    type="button"
                    onClick={() => {
                      setCargoType(cargo);
                      setShowCargoDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-teal-50 text-xs sm:text-sm font-semibold text-slate-800 hover:text-teal-800 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-teal-600" />
                      {cargo}
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">Chọn hàng này</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick chips of unique cargos */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Chọn nhanh:</span>
            {knownCargos.slice(0, 8).map((cargo) => (
              <button
                key={cargo}
                type="button"
                onClick={() => setCargoType(cargo)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors cursor-pointer ${
                  cargoType === cargo
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white hover:bg-teal-50 border-slate-200 text-slate-700 hover:border-teal-300'
                }`}
              >
                {cargo}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================
            NÚT "LƯU"
        ======================================================== */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-extrabold text-lg shadow-md shadow-blue-800/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-6 h-6" />
            <span>LƯU</span>
          </button>

          {/* Nút làm mới phụ bên dưới */}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới biểu mẫu</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
