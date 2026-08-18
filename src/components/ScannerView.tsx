import React, { useState } from 'react';
import { TradeSetup, MarketCategory } from '../types';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Target,
  ShieldAlert,
  ArrowRight,
  Send,
  Award,
  Layers,
} from 'lucide-react';

interface ScannerViewProps {
  setups: TradeSetup[];
  onSelectSetup: (setup: TradeSetup) => void;
  onRefreshScan: (categories?: MarketCategory[]) => Promise<void>;
  isLoading: boolean;
  onSendToTelegram: (setup: TradeSetup) => void;
  onSendToBale: (setup: TradeSetup) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  setups,
  onSelectSetup,
  onRefreshScan,
  isLoading,
  onSendToTelegram,
  onSendToBale,
}) => {
  const [filterAction, setFilterAction] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');

  const filtered = setups.filter((s) => filterAction === 'ALL' || s.action === filterAction);

  return (
    <div className="space-y-4">
      {/* Scanner Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              اسکنر خودکار و رادار ستاپ‌های فیوچرز (TradingView AI Scanner)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            بررسی همزمان جفت‌ارزهای پرحجم برای شناسایی بهترین فرصت‌های ورود لانگ و شورت با بالاترین وین‌ریت
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Action Filter */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterAction('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterAction === 'ALL' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400'
              }`}
            >
              همه ({setups.length})
            </button>
            <button
              onClick={() => setFilterAction('LONG')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterAction === 'LONG' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
              }`}
            >
              لانگ (LONG)
            </button>
            <button
              onClick={() => setFilterAction('SHORT')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterAction === 'SHORT' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400'
              }`}
            >
              شورت (SHORT)
            </button>
          </div>

          {/* Refresh Button */}
          <button
            id="refresh-scanner-btn"
            onClick={() => onRefreshScan()}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-950 active:scale-95 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'در حال اسکن چارت‌ها...' : 'اسکن مجدد بازار'}
          </button>
        </div>
      </div>

      {/* Setups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((setup) => {
          const isLong = setup.action === 'LONG';
          const isShort = setup.action === 'SHORT';

          return (
            <div
              key={setup.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
                      {setup.symbol}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-400">
                      {setup.timeframe}
                    </span>
                  </div>

                  <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      isLong
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isShort
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{setup.action}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block">نقطه ورود بهینه:</span>
                    <span className="mono-num font-bold text-slate-200">${setup.optimalEntry.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block">تارگت سود اول (TP1):</span>
                    <span className="mono-num font-bold text-emerald-400">
                      ${setup.takeProfits[0]?.price.toLocaleString()} (+{setup.takeProfits[0]?.pnlPercent}%)
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block">حد ضرر (SL):</span>
                    <span className="mono-num font-bold text-rose-400">${setup.stopLoss.price.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block">نسبت سود/ضرر (RR):</span>
                    <span className="mono-num font-bold text-indigo-400">1:{setup.riskRewardRatio}</span>
                  </div>
                </div>

                {/* Short Commentary */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {setup.analysisFa}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectSetup(setup)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span>مشاهده در چارت</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSendToTelegram(setup)}
                    className="p-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 transition-all"
                    title="ارسال به تلگرام"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onSendToBale(setup)}
                    className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all"
                    title="ارسال به بله"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
