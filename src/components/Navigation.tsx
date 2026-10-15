import React from 'react';
import { Anchor, BarChart3, PlusCircle, Users } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  receiptsCount: number;
  dockedCount: number;
  staffCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  receiptsCount,
  dockedCount,
  staffCount = 5,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto" aria-label="Tabs">
          {/* Tab 1: Nhập */}
          <button
            type="button"
            onClick={() => onTabChange('entry')}
            className={`group inline-flex items-center gap-2 py-3.5 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'entry'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <div
              className={`p-1.5 rounded-md transition-colors ${
                activeTab === 'entry' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
            </div>
            <span>Nhập</span>
            <span
              className={`hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${
                activeTab === 'entry'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Thông tin sà lan
            </span>
          </button>

          {/* Tab 2: Thu Phí */}
          <button
            type="button"
            onClick={() => onTabChange('management')}
            className={`group inline-flex items-center gap-2 py-3.5 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'management'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <div
              className={`p-1.5 rounded-md transition-colors ${
                activeTab === 'management' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
              }`}
            >
              <Anchor className="w-4 h-4" />
            </div>
            <span>Thu Phí</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                activeTab === 'management'
                  ? 'bg-amber-100 text-amber-900 font-bold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {receiptsCount} sà lan
            </span>
          </button>

          {/* Tab 3: Báo Cáo */}
          <button
            type="button"
            onClick={() => onTabChange('reports')}
            className={`group inline-flex items-center gap-2 py-3.5 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <div
              className={`p-1.5 rounded-md transition-colors ${
                activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </div>
            <span>Báo Cáo</span>
            <span
              className={`hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${
                activeTab === 'reports'
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Bảng kê & In biên bản
            </span>
          </button>

          {/* Tab 4: Nhân Sự (thông tin những người nộp tiền) */}
          <button
            type="button"
            onClick={() => onTabChange('personnel')}
            className={`group inline-flex items-center gap-2 py-3.5 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'personnel'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <div
              className={`p-1.5 rounded-md transition-colors ${
                activeTab === 'personnel' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
            <span>Nhân Sự</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                activeTab === 'personnel'
                  ? 'bg-indigo-100 text-indigo-900 font-bold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {staffCount} người
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};
