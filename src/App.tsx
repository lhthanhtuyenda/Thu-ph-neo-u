import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  ReceiptRecord,
  Staff,
  PortConfig,
} from './types';
import {
  getStoredReceipts,
  saveReceipts,
  getStoredStaff,
  saveStaff,
  getStoredConfig,
  saveConfig,
  INITIAL_RECEIPTS,
  INITIAL_STAFF,
  DEFAULT_CONFIG,
} from './utils/storage';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ReceiptForm } from './components/ReceiptForm';
import { PortManagementTable } from './components/PortManagementTable';
import { ReportsView } from './components/ReportsView';
import { PersonnelView } from './components/PersonnelView';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { StaffModal } from './components/StaffModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { LoginScreen } from './components/LoginScreen';
import { CloudSyncModal } from './components/CloudSyncModal';

import {
  testFirestoreConnection,
  subscribeToReceipts,
  fetchAllReceiptsFromFirestore,
  deduplicateReceipts,
  syncReceiptToFirestore,
  syncMultipleReceiptsToFirestore,
  removeReceiptFromFirestore,
  subscribeToConfig,
  syncConfigToFirestore,
  subscribeToStaff,
  syncStaffListToFirestore,
} from './firebase';

const AUTH_STORAGE_KEY = 'thanh_phuoc_auth_v1';

export default function App() {
  // Authentication state (ID: Admin, pass: Admin@789)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Cloud Firestore connection indicator
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('entry');

  // Main Persistent States (khởi tạo từ localStorage làm bộ đệm offline nhanh)
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(() => getStoredReceipts());
  const [staffList, setStaffList] = useState<Staff[]>(() => getStoredStaff());
  const [config, setConfig] = useState<PortConfig>(() => getStoredConfig());

  // Modal States
  const [selectedReceiptForThermal, setSelectedReceiptForThermal] = useState<ReceiptRecord | null>(null);
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState<boolean>(false);
  const [showCloudModal, setShowCloudModal] = useState<boolean>(false);

  // Lưu đệm localStorage để hoạt động ngoại tuyến nếu mất mạng
  useEffect(() => {
    saveReceipts(receipts);
  }, [receipts]);

  useEffect(() => {
    saveStaff(staffList);
  }, [staffList]);

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // ========================================================
  // ĐỒNG BỘ THỜI GIAN THỰC VỚI GOOGLE CLOUD FIRESTORE
  // ========================================================
  useEffect(() => {
    // 1. Kiểm tra kết nối Firestore
    testFirestoreConnection().then((connected) => {
      setIsCloudConnected(connected);
    });

    // 2. Lắng nghe phiếu sà lan từ đám mây (Realtime)
    const unsubReceipts = subscribeToReceipts(
      (cloudReceipts) => {
        setIsCloudConnected(true);
        if (cloudReceipts.length > 0) {
          setReceipts(cloudReceipts);
        } else {
          // Nếu đám mây đang rỗng nhưng máy có dữ liệu sà lan sẵn -> đồng bộ lên đám mây
          const local = getStoredReceipts();
          if (local.length > 0) {
            syncMultipleReceiptsToFirestore(local).catch(() => {});
          }
        }
      },
      (connected) => {
        setIsCloudConnected(connected);
      }
    );

    // 3. Lắng nghe cấu hình bến cảng từ đám mây (Realtime)
    const unsubConfig = subscribeToConfig((cloudConfig) => {
      setConfig(cloudConfig);
    });

    // 4. Lắng nghe nhân sự từ đám mây (Realtime)
    const unsubStaff = subscribeToStaff((cloudStaff) => {
      setStaffList(cloudStaff);
    });

    return () => {
      unsubReceipts();
      unsubConfig();
      unsubStaff();
    };
  }, []);

  // Ép đồng bộ toàn bộ dữ liệu hiện tại lên Cloud
  const handleForceSyncAll = async () => {
    await Promise.all([
      syncMultipleReceiptsToFirestore(receipts),
      syncStaffListToFirestore(staffList),
      syncConfigToFirestore(config),
    ]);
    setIsCloudConnected(true);
  };

  // Tải lại toàn bộ dữ liệu từ Cloud về máy
  const handleReloadFromCloud = async () => {
    const cloudReceipts = await fetchAllReceiptsFromFirestore();
    setReceipts(cloudReceipts);
    saveReceipts(cloudReceipts);
    setIsCloudConnected(true);
  };

  // Lọc sạch trùng lặp sà lan trên toàn hệ thống
  const handleDeduplicateAll = async (): Promise<number> => {
    const cleaned = deduplicateReceipts(receipts);
    setReceipts(cleaned);
    saveReceipts(cleaned);

    const keepIdSet = new Set(cleaned.map((r) => r.id));
    const duplicateIds = receipts.filter((r) => !keepIdSet.has(r.id)).map((r) => r.id);
    for (const dId of duplicateIds) {
      removeReceiptFromFirestore(dId).catch(() => {});
    }
    return cleaned.length;
  };

  // Handler: Add new receipt
  const handleSaveReceipt = (newReceipt: ReceiptRecord) => {
    setReceipts((prev) => [newReceipt, ...prev]);
    syncReceiptToFirestore(newReceipt).catch((err) => {
      console.warn('Lỗi đồng bộ sà lan lên đám mây:', err);
    });
  };

  // Handler: Update existing receipt (e.g. after collecting fee)
  const handleUpdateReceipt = (updatedReceipt: ReceiptRecord) => {
    setReceipts((prev) =>
      prev.map((r) => (r.id === updatedReceipt.id ? updatedReceipt : r))
    );
    syncReceiptToFirestore(updatedReceipt).catch((err) => {
      console.warn('Lỗi cập nhật sà lan lên đám mây:', err);
    });
  };

  // Handler: Delete receipt
  const handleDeleteReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    removeReceiptFromFirestore(id).catch((err) => {
      console.warn('Lỗi xóa sà lan trên đám mây:', err);
    });
  };

  // Handler: Bulk submit / deposit receipts
  const handleBulkSubmitReceipts = (receiptIds: string[], submittedDate?: string) => {
    const timestamp = submittedDate
      ? `${submittedDate}T${new Date().toTimeString().slice(0, 8)}`
      : new Date().toISOString();
    
    let affectedRecords: ReceiptRecord[] = [];
    setReceipts((prev) => {
      const updated = prev.map((r) =>
        receiptIds.includes(r.id)
          ? { ...r, submitted: true, submittedAt: timestamp }
          : r
      );
      affectedRecords = updated.filter((r) => receiptIds.includes(r.id));
      return updated;
    });

    if (affectedRecords.length > 0) {
      syncMultipleReceiptsToFirestore(affectedRecords).catch(() => {});
    }
  };

  // Handler: Add multiple receipts (from Excel import) với cơ chế chống cộng dồn / trùng lặp
  const handleImportReceipts = async (
    importedReceipts: ReceiptRecord[],
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    if (mode === 'replace') {
      // 1. Chế độ thay thế toàn bộ: Xóa toàn bộ danh sách cũ và nạp danh sách mới từ file Excel này
      const oldIds = receipts.map((r) => r.id);
      setReceipts(importedReceipts);
      saveReceipts(importedReceipts);

      await syncMultipleReceiptsToFirestore(importedReceipts);
      const newIdSet = new Set(importedReceipts.map((r) => r.id));
      const toDeleteIds = oldIds.filter((id) => !newIdSet.has(id));
      for (const delId of toDeleteIds) {
        removeReceiptFromFirestore(delId).catch(() => {});
      }
    } else {
      // 2. Chế độ hợp nhất & chống trùng lặp thông minh:
      setReceipts((prev) => {
        const keyMap = new Map<string, ReceiptRecord>();

        // Nạp danh sách cũ vào map theo key: Biển số + Ngày cập bến
        prev.forEach((r) => {
          const key = `${r.vehiclePlate.trim().toUpperCase()}___${r.date}`;
          keyMap.set(key, r);
        });

        // Hợp nhất dữ liệu mới từ Excel (nếu trùng thì cập nhật, giữ nguyên ID cũ)
        const updatedList: ReceiptRecord[] = [];
        importedReceipts.forEach((imp) => {
          const key = `${imp.vehiclePlate.trim().toUpperCase()}___${imp.date}`;
          const existing = keyMap.get(key);
          if (existing) {
            // Đã có sà lan này: cập nhật số liệu mới nhất nhưng giữ nguyên ID cũ để không nhân đôi trên Firestore
            const merged: ReceiptRecord = {
              ...existing,
              ...imp,
              id: existing.id,
              submitted: existing.submitted || imp.submitted,
              submittedAt: existing.submittedAt || imp.submittedAt,
            };
            keyMap.set(key, merged);
            updatedList.push(merged);
          } else {
            // Sà lan mới chưa có: thêm vào danh sách
            keyMap.set(key, imp);
            updatedList.push(imp);
          }
        });

        const finalReceipts = Array.from(keyMap.values()).sort((a, b) =>
          (b.date || '').localeCompare(a.date || '')
        );
        saveReceipts(finalReceipts);
        syncMultipleReceiptsToFirestore(updatedList).catch(() => {});
        return finalReceipts;
      });
    }
  };

  // Handler: Update staff list
  const handleUpdateStaffList = (newList: Staff[]) => {
    setStaffList(newList);
    syncStaffListToFirestore(newList).catch(() => {});
  };

  // Handler: Update config
  const handleSaveConfig = (newConfig: PortConfig) => {
    setConfig(newConfig);
    syncConfigToFirestore(newConfig).catch(() => {});
  };

  // Handler: Update denominations
  const handleUpdateDenominations = (newDenoms: number[]) => {
    const newCfg = { ...config, denominations: newDenoms };
    setConfig(newCfg);
    syncConfigToFirestore(newCfg).catch(() => {});
  };

  // Handler: Reset sample data
  const handleResetSampleData = () => {
    if (confirm('Khôi phục dữ liệu sà lan mẫu của Cảng Thạnh Phước (Biconsi)?')) {
      setReceipts(INITIAL_RECEIPTS);
      setStaffList(INITIAL_STAFF);
      setConfig(DEFAULT_CONFIG);
      saveReceipts(INITIAL_RECEIPTS);
      saveStaff(INITIAL_STAFF);
      saveConfig(DEFAULT_CONFIG);
    }
  };

  // Handler: Quick prefill from Tariff Calculator in Management tab
  const handleQuickPrefill = (amount: number) => {
    setActiveTab('entry');
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const dockedCount = receipts.filter((r) => r.berthStatus === 'docked').length;

  // Nếu chưa đăng nhập: Hiển thị màn hình đăng nhập (ID: Admin, pass: Admin@789)
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} isCloudConnected={isCloudConnected} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* 1. Header Banner */}
      <Header
        config={config}
        receipts={receipts}
        isCloudConnected={isCloudConnected}
        onOpenCloudModal={() => setShowCloudModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onResetSampleData={handleResetSampleData}
        onLogout={handleLogout}
      />

      {/* 2. Main Navigation Bar with 4 primary menus */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        receiptsCount={receipts.length}
        dockedCount={dockedCount}
        staffCount={staffList.length}
      />

      {/* 3. Main Content Views */}
      <main className="flex-1 pb-12">
        {/* Tab 1: [Nhập] */}
        {activeTab === 'entry' && (
          <ReceiptForm
            config={config}
            existingReceipts={receipts}
            onSaveReceipt={handleSaveReceipt}
          />
        )}

        {/* Tab 2: [Thu Phí] */}
        {activeTab === 'management' && (
          <PortManagementTable
            receipts={receipts}
            config={config}
            staffList={staffList}
            onOpenThermalReceipt={(r) => setSelectedReceiptForThermal(r)}
            onUpdateReceipt={handleUpdateReceipt}
            onDeleteReceipt={handleDeleteReceipt}
            onImportReceipts={handleImportReceipts}
          />
        )}

        {/* Tab 3: [Báo Cáo] */}
        {activeTab === 'reports' && (
          <ReportsView
            receipts={receipts}
            staffList={staffList}
            config={config}
            onOpenGoogleSheetsModal={() => setShowGoogleSheetsModal(true)}
            onBulkSubmitReceipts={handleBulkSubmitReceipts}
            onUpdateConfig={handleSaveConfig}
          />
        )}

        {/* Tab 4: [Nhân Sự] - Thông tin những người nộp tiền */}
        {activeTab === 'personnel' && (
          <PersonnelView
            staffList={staffList}
            onUpdateStaffList={handleUpdateStaffList}
          />
        )}
      </main>

      {/* 4. Footer info */}
      <footer className="bg-slate-900 text-slate-400 py-5 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-white font-bold text-sm tracking-wide">
              {config.companyName}
            </div>
            <div className="mt-0.5 text-slate-400">
              {config.address}
            </div>
          </div>
          <div className="text-center md:text-right text-slate-400">
            <div>Cảng Thạnh Phước (Biconsi Group)</div>
          </div>
        </div>
      </footer>

      {/* ========================================================
          MODALS
      ======================================================== */}
      {/* 1. Modal Hóa Đơn Nhiệt 80mm / 58mm */}
      {selectedReceiptForThermal && (
        <ThermalReceiptModal
          receipt={selectedReceiptForThermal}
          config={config}
          onClose={() => setSelectedReceiptForThermal(null)}
        />
      )}

      {/* 2. Modal Quản Lý Nhân Sự */}
      {showStaffModal && (
        <StaffModal
          staffList={staffList}
          onClose={() => setShowStaffModal(false)}
          onUpdateStaffList={handleUpdateStaffList}
        />
      )}

      {/* 3. Modal Cài Đặt Bến Cảng */}
      {showSettingsModal && (
        <SettingsModal
          config={config}
          onClose={() => setShowSettingsModal(false)}
          onSaveConfig={handleSaveConfig}
        />
      )}

      {/* 4. Modal Xuất / Đồng Bộ Google Sheets */}
      {showGoogleSheetsModal && (
        <GoogleSheetsModal
          receipts={receipts}
          config={config}
          onClose={() => setShowGoogleSheetsModal(false)}
          onSaveWebhookUrl={(url) => setConfig({ ...config, googleSheetsWebhookUrl: url })}
        />
      )}

      {/* 5. Modal Chi Tiết & Đồng Bộ Cơ Sở Dữ Liệu Đám Mây (Google Cloud Firestore) */}
      <CloudSyncModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        isCloudConnected={isCloudConnected}
        receiptsCount={receipts.length}
        staffCount={staffList.length}
        onForceSyncAll={handleForceSyncAll}
        onReloadFromCloud={handleReloadFromCloud}
        onDeduplicate={handleDeduplicateAll}
      />
    </div>
  );
}
