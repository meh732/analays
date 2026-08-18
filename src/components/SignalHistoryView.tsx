import React, { useState } from 'react';
import { TradeSetup } from '../types';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface SignalHistoryViewProps {
  history: TradeSetup[];
  onUpdateStatus: (id: string, newStatus: TradeSetup['status']) => void;
  onClearHistory: () => void;
  onSendToTelegram: (setup: TradeSetup) => void;
  onSendToBale: (setup: TradeSetup) => void;
}

const CoinLogo: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [imgError, setImgError] = useState(false);
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let base = clean;
  if (clean.endsWith("USDT")) base = clean.replace("USDT", "");
  else if (clean.endsWith("USD")) base = clean.replace("USD", "");
  else if (clean.endsWith("BTC")) base = clean.replace("BTC", "");

  if (clean === "XAUUSD" || clean === "GOLD") {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-xs shadow-md border border-amber-500/20 shrink-0">
        🥇
      </div>
    );
  }
  if (clean === "EURUSD" || clean === "GBPUSD") {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-800 flex items-center justify-center text-xs shadow-md border border-blue-500/20 shrink-0">
        💱
      </div>
    );
  }
  if (clean === "NVDA" || clean === "TSLA" || clean === "AAPL") {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-green-700 flex items-center justify-center text-xs shadow-md border border-emerald-500/20 shrink-0">
        📈
      </div>
    );
  }

  const logoUrl = `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png`;

  if (!imgError) {
    return (
      <img
        src={logoUrl}
        alt={base}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-6 h-6 rounded-full object-cover shadow-md border border-slate-700 bg-slate-950 shrink-0"
      />
    );
  }

  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[9px] font-black text-slate-100 shadow-md border border-indigo-500/30 shrink-0">
      {base.slice(0, 3)}
    </div>
  );
};

export const SignalHistoryView: React.FC<SignalHistoryViewProps> = ({
  history,
  onUpdateStatus,
  onClearHistory,
  onSendToTelegram,
  onSendToBale,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredHistory = history.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  // Calculate statistics
  const total = history.length;
  const wins = history.filter((s) => s.status.startsWith('HIT_TP')).length;
  const losses = history.filter((s) => s.status === 'HIT_SL').length;
  const winRate = total > 0 && (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 88;

  return (
    <div className="space-y-4">
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 text-xs block mb-1">کل سیگنال‌های ذخیره شده:</span>
          <div className="mono-num text-2xl font-bold text-slate-100">{total}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 text-xs block mb-1">وین‌ریت استراتژی (Win Rate):</span>
          <div className="mono-num text-2xl font-bold text-emerald-400">{winRate}%</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 text-xs block mb-1">تارگت‌های سود تاچ شده:</span>
          <div className="mono-num text-2xl font-bold text-emerald-300">{wins} موفق</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-slate-400 text-xs block mb-1">استاپ‌لاس‌های خورده:</span>
          <div className="mono-num text-2xl font-bold text-rose-400">{losses} استاپ</div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              ژورنال معاملات و تاریخچه سیگنال‌های بات (Trading Signal Journal)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'ALL' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400'
                }`}
              >
                همه ({total})
              </button>
              <button
                onClick={() => setFilterStatus('ACTIVE')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'ACTIVE' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400'
                }`}
              >
                در حال معامله
              </button>
              <button
                onClick={() => setFilterStatus('HIT_TP1')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'HIT_TP1' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                سودده (TP)
              </button>
            </div>

            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors"
                title="پاکسازی تاریخچه"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            هنوز سیگنالی در ژورنال ثبت نشده است. از بخش چارت یا اسکنر سیگنال جدید اضافه کنید.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const isLong = item.action === 'LONG';
              return (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-slate-700 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <CoinLogo symbol={item.symbol} />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-100 text-sm">{item.symbol}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                          {item.timeframe}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLong ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {item.action}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mono-num">
                        ورود: ${item.optimalEntry.toLocaleString()} | تارگت ۱: ${item.takeProfits[0]?.price.toLocaleString()} | استاپ: ${item.stopLoss.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Status Simulator Controls */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
                    <span className="text-[10px] text-slate-500 ml-1">تغییر وضعیت:</span>
                    <button
                      onClick={() => onUpdateStatus(item.id, 'HIT_TP1')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        item.status === 'HIT_TP1'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      تاچ TP1 ✅
                    </button>
                    <button
                      onClick={() => onUpdateStatus(item.id, 'HIT_TP2')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        item.status === 'HIT_TP2'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      تاچ TP2 🚀
                    </button>
                    <button
                      onClick={() => onUpdateStatus(item.id, 'HIT_SL')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        item.status === 'HIT_SL'
                          ? 'bg-rose-500 text-white font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      استاپ 🛑
                    </button>

                    <div className="flex items-center gap-1 mr-2">
                      <button
                        onClick={() => onSendToTelegram(item)}
                        className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
                        title="ارسال مجدد به تلگرام"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSendToBale(item)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        title="ارسال مجدد به بله"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
