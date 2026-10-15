import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  Download,
  ExternalLink,
  CheckCircle,
  Code,
  Send,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { ReceiptRecord, PortConfig } from '../types';
import { exportReceiptsToExcel, copyToClipboardTSV } from '../utils/excel';
import { syncFeeToGoogleSheet } from '../utils/googleSheetsSync';

interface GoogleSheetsModalProps {
  receipts: ReceiptRecord[];
  config: PortConfig;
  onClose: () => void;
  onSaveWebhookUrl: (url: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  receipts,
  config,
  onClose,
  onSaveWebhookUrl,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(config.googleSheetsWebhookUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTSV, setCopiedTSV] = useState(false);

  // Script chuẩn ghi từ dòng B9 cho Google Sheet của người dùng vào trang tính tên "APP"
  const exactAppsScript = `/**
 * Google Apps Script tự động ghi nhận khi bấm [THU PHÍ]
 * Ghi vào trang tính (tab sheet) tên: "APP"
 * Ghi bắt đầu từ dòng B9 (8 cột từ B đến I):
 * Cột B: Thời gian (thời gian thu phí)
 * Cột C: Phương tiện
 * Cột D: Chủ phương tiện / Thuyền trưởng
 * Cột E: Trọng tải (DWT)
 * Cột F: Tên hàng hóa
 * Cột G: Người thu
 * Cột H: Số thu
 * Cột I: Ghi chú (TM / TM-HĐ / CK-HĐ)
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // 1. Lấy sheet tên "APP" (nếu không có thì lấy sheet đầu tiên)
    var targetSheet = ss.getSheetByName("APP") || ss.getSheets()[0];

    var payload = JSON.parse(e.postData.contents);
    var record = payload.record || payload;

    // 2. Tìm dòng trống đầu tiên từ dòng 9 trở đi ở Cột B
    var startRow = 9;
    var maxRows = targetSheet.getMaxRows();
    var targetRow = startRow;

    // Quét tìm ô trống đầu tiên ở Cột B kể từ dòng 9
    var colBValues = targetSheet.getRange(startRow, 2, Math.max(1, maxRows - startRow + 1), 1).getValues();
    for (var r = 0; r < colBValues.length; r++) {
      var val = colBValues[r][0];
      if (val === "" || val === null || val === undefined) {
        targetRow = startRow + r;
        break;
      }
    }
    if (targetRow > maxRows) {
      targetSheet.insertRowsAfter(maxRows, 10);
    }

    // 3. Ghi 8 cột từ B đến I:
    // B: Thời gian
    // C: Phương tiện
    // D: Chủ phương tiện / Thuyền trưởng
    // E: Trọng tải (DWT)
    // F: Tên hàng hóa
    // G: Người thu
    // H: Số thu
    // I: Ghi chú
    var rowData = [
      record.collectedDate || "",
      record.vehiclePlate || "",
      record.ownerCaptain || "",
      record.dwt || 0,
      record.cargoType || "",
      record.collectorName || "",
      record.totalAmount || 0,
      record.notes || "TM"
    ];

    targetSheet.getRange(targetRow, 2, 1, 8).setValues([rowData]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      writtenRow: targetRow
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyTSV = () => {
    copyToClipboardTSV(receipts);
    setCopiedTSV(true);
    setTimeout(() => setCopiedTSV(false), 3000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(exactAppsScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleExportExcel = () => {
    exportReceiptsToExcel(receipts, config, 'Bang_Ke_Thu_Phi_Cang_Thanh_Phuoc');
  };

  const handleSaveWebhook = () => {
    onSaveWebhookUrl(webhookUrl);
    setSyncStatus('Đã lưu Webhook URL thành công! Từ bây giờ mỗi lần bấm THU PHÍ sẽ tự động ghi vào Sheet.');
  };

  const handleTestSync = async () => {
    if (!webhookUrl.trim()) {
      alert('Vui lòng dán Webhook URL tạo được từ Google Sheet vào ô trên!');
      return;
    }

    onSaveWebhookUrl(webhookUrl);
    setIsSyncing(true);
    setSyncStatus(null);

    const testItem: ReceiptRecord = receipts[0] || {
      id: 'TP-TEST-001',
      date: new Date().toISOString().slice(0, 10),
      collectedDate: new Date().toISOString().slice(0, 10),
      vehiclePlate: 'TG 13939',
      ownerCaptain: 'Nguyễn Văn Hải',
      dwt: 1200,
      cargoType: 'Viên nén',
      collectorName: 'Tuấn',
      totalAmount: 400000,
      paymentMethod: 'TIỀN MẶT',
      berthStatus: 'docked' as const,
      createdAt: new Date().toISOString(),
    };

    const res = await syncFeeToGoogleSheet(testItem, { ...config, googleSheetsWebhookUrl: webhookUrl });
    setIsSyncing(false);
    if (res.success) {
      setSyncStatus('✓ ĐÃ GỬI DỮ LIỆU THỬ NGHIỆM THÀNH CÔNG VÀO DÒNG B9 CỦA GOOGLE SHEET!');
    } else {
      setSyncStatus(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base">Tự Động Ghi Vào Google Sheets (Từ dòng B9)</h3>
              <p className="text-xs text-emerald-200">
                Liên kết bảng tính: 1vT_jIaX3b2rKHg0Ea0D2jiRhxCXd54XcW0iQDDCkcJU
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* Thông tin sheet đích */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-blue-950 text-sm">
                Google Sheet đích đã được nhận diện
              </div>
              <p className="text-blue-800 leading-relaxed">
                Đường link bảng tính của bạn: <span className="font-mono text-xs font-bold text-blue-900">.../d/1vT_jIaX3b2rKHg0Ea0D2jiRhxCXd54XcW0iQDDCkcJU (gid=1300378637)</span>
              </p>
              <p className="text-blue-700 text-[11px]">
                Mỗi khi bấm nút <strong>THU PHÍ</strong>, hệ thống sẽ tự động ghi 7 cột: <strong>Thời gian (B) - Phương tiện (C) - Chủ tàu/thuyền trưởng (D) - Tên hàng hóa (E) - Người thu (F) - Số thu (G) - Ghi chú (H)</strong> từ <strong>dòng B9</strong> trở đi.
              </p>
            </div>
          </div>

          {/* Hướng dẫn 3 bước kết nối Webhook */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Code className="w-4 h-4 text-purple-600" />
              Cách kích hoạt tự động (Làm 1 lần duy nhất trong 2 phút):
            </div>

            <ol className="list-decimal list-inside space-y-2 text-slate-700 leading-relaxed">
              <li>
                Mở link Google Sheet của bạn &gt; Trên thanh menu chọn <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.
              </li>
              <li>
                Xóa hết code cũ (nếu có), bấm nút bên dưới để <strong>Sao chép đoạn mã Apps Script</strong> và dán vào đó:
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedScript ? '✓ ĐÃ SAO CHÉP MÃ XONG!' : 'Sao Chép Mã Apps Script (Chuẩn Dòng B9)'}</span>
                  </button>
                </div>
              </li>
              <li>
                Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai dưới dạng ứng dụng web mới (New deployment)</strong>:
                <ul className="list-disc list-inside ml-4 text-[11px] text-slate-600 mt-1 space-y-0.5">
                  <li>Thực thi dưới dạng: <strong>Tôi (Me)</strong></li>
                  <li>Ai có quyền truy cập: <strong>Bất kỳ ai (Anyone)</strong></li>
                </ul>
              </li>
              <li>
                Copy đường link <strong>Web app URL</strong> (bắt đầu bằng <code className="bg-white px-1 border rounded">https://script.google.com/macros/s/.../exec</code>) rồi dán vào ô bên dưới:
              </li>
            </ol>

            {/* Input Webhook URL */}
            <div className="pt-1 space-y-1.5">
              <label className="block text-slate-800 font-bold text-xs">
                Dán URL Web App Google Sheets vào đây:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold cursor-pointer transition-colors"
                >
                  Lưu
                </button>
              </div>
            </div>

            {syncStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs">
                {syncStatus}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://docs.google.com/spreadsheets/d/1vT_jIaX3b2rKHg0Ea0D2jiRhxCXd54XcW0iQDDCkcJU/edit?gid=1300378637#gid=1300378637"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Google Sheet của bạn</span>
              </a>

              <button
                type="button"
                disabled={isSyncing}
                onClick={handleTestSync}
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Đang gửi sang Sheet...' : 'Gửi Thử Nghiệm Sang Dòng B9'}</span>
              </button>
            </div>
          </div>

          {/* Phương án dự phòng: Sao chép nhanh 1 cú click */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-emerald-900 text-xs">
                Sao chép dữ liệu để dán nhanh (Ctrl + V)
              </div>
              <p className="text-emerald-700 text-[11px]">
                Nếu chưa gắn Webhook, bạn có thể bấm nút này rồi sang ô B9 của Google Sheet bấm <strong>Ctrl + V</strong> là xong ngay.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyTSV}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedTSV ? '✓ ĐÃ CHÉP' : 'Sao Chép'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 cursor-pointer"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
};
