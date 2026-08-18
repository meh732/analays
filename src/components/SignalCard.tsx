import React, { useState } from 'react';
import { TradeSetup } from '../types';
import { TradingViewWidget } from './TradingViewWidget';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Zap,
  Copy,
  Check,
  Send,
  Sparkles,
  Calculator,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
  Activity,
  Compass,
  Scale,
  BookOpen,
  Brain,
  RefreshCw,
  CheckCircle2,
  Clock,
  Timer,
  Hourglass,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SignalCardProps {
  setup: TradeSetup;
  onSendToTelegram: (setup: TradeSetup) => void;
  onSendToBale: (setup: TradeSetup) => void;
  onOpenCalculator?: (setup: TradeSetup) => void;
  onSaveToJournal?: (setup: TradeSetup) => void;
  onOpenLegal?: () => void;
  onReAnalyzeWithMode?: (mode: 'OFFLINE_RULES' | 'ONLINE_AI') => void;
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
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-sm shadow-md border border-amber-500/20 shrink-0">
        🥇
      </div>
    );
  }
  if (clean === "EURUSD" || clean === "GBPUSD") {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-800 flex items-center justify-center text-sm shadow-md border border-blue-500/20 shrink-0">
        💱
      </div>
    );
  }
  if (clean === "NVDA" || clean === "TSLA" || clean === "AAPL") {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-green-700 flex items-center justify-center text-sm shadow-md border border-emerald-500/20 shrink-0">
        📈
      </div>
    );
  }

  const logoUrl = `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png`;
  const fallbackLogoUrl = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${base.toLowerCase()}.png`;

  if (!imgError) {
    return (
      <img
        src={logoUrl}
        alt={base}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-8 h-8 rounded-full object-cover shadow-md border border-slate-700 bg-slate-950 shrink-0"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-black text-slate-100 shadow-md border border-indigo-500/30 shrink-0">
      {base.slice(0, 3)}
    </div>
  );
};

export const SignalCard: React.FC<SignalCardProps> = ({
  setup,
  onSendToTelegram,
  onSendToBale,
  onOpenCalculator,
  onSaveToJournal,
  onOpenLegal,
  onReAnalyzeWithMode,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(true);
  const [showEducationalDetails, setShowEducationalDetails] = useState(true);
  const [activeTab, setActiveTab] = useState<'fa' | 'en' | 'raw' | 'edu'>('fa');
  const [showEmbeddedChart, setShowEmbeddedChart] = useState(false);

  const isLong = setup.action === 'LONG';
  const isShort = setup.action === 'SHORT';
  const isWait = setup.action === 'WAIT';
  const isOffline = setup.engineMode === 'OFFLINE_RULES';

  const handleCopy = () => {
    navigator.clipboard.writeText(setup.telegramMessage || setup.baleMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actionBg = isLong
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    : isShort
    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    : 'bg-amber-500/10 border-amber-500/30 text-amber-400';

  return (
    <div
      id={`signal-card-${setup.id}`}
      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all hover:border-slate-700"
    >
      {/* Decorative Glow */}
      <div
        className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isLong ? 'bg-emerald-500' : isShort ? 'bg-rose-500' : 'bg-amber-500'
        }`}
      />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`px-3.5 py-1.5 rounded-xl border font-bold text-sm flex items-center gap-2 shadow-inner ${actionBg}`}
          >
            {isLong && <TrendingUp className="w-4 h-4" />}
            {isShort && <TrendingDown className="w-4 h-4" />}
            {isWait && <Activity className="w-4 h-4" />}
            <span>
              {isLong ? '🟢 سیگنال لانگ (LONG)' : isShort ? '🔴 سیگنال شورت (SHORT)' : '🟡 وضعیت انتظار (WAIT)'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <CoinLogo symbol={setup.symbol} />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-100 tracking-wide font-['Plus_Jakarta_Sans',sans-serif]">
                {setup.symbol}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-semibold">
                {setup.timeframe}
              </span>
            </div>
          </div>

          {/* Engine Mode Badge */}
          {isOffline ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              <span>⚡ تحلیل آفلاین (دیتای زنده / بدون AI)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-sm">
              <Brain className="w-3.5 h-3.5" />
              <span>🧠 هوش مصنوعی آنلاین (Gemini AI)</span>
            </div>
          )}
        </div>

        {/* Grade & Confidence Badge + Re-Analyze Switch */}
        <div className="flex items-center gap-2">
          {/* embedded chart toggle */}
          <button
            onClick={() => setShowEmbeddedChart(!showEmbeddedChart)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
              showEmbeddedChart
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
            }`}
            title="نمایش یا پنهان‌سازی نمودار زنده قیمت"
          >
            {showEmbeddedChart ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showEmbeddedChart ? 'بستن چارت' : '👁️ مشاهده چارت'}</span>
          </button>

          {onReAnalyzeWithMode && (
            <button
              onClick={() => onReAnalyzeWithMode(isOffline ? 'ONLINE_AI' : 'OFFLINE_RULES')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
              title={isOffline ? 'تغییر به تحلیل هوش مصنوعی آنلاین' : 'تغییر به تحلیل دانش و استراتژی آفلاین'}
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>{isOffline ? 'تحلیل با هوش مصنوعی' : 'تحلیل با دانش آفلاین'}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Award className="w-3.5 h-3.5" />
            <span>گرید {setup.grade}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="mono-num">{setup.confidence}% ضریب اطمینان</span>
          </div>
        </div>
      </div>

      {/* Embedded live chart */}
      {showEmbeddedChart && (
        <div className="w-full h-[440px] mt-3 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
          <TradingViewWidget symbol={setup.symbol} timeframe={setup.timeframe} />
        </div>
      )}

      {/* Real-Time Freshness & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/60 border border-slate-800/60 rounded-xl px-4 py-2 mt-3 mb-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>زمان تحلیل:</span>
          <span className="text-slate-200 font-semibold mono-num">
            {new Date(setup.timestamp || Date.now()).toLocaleString("fa-IR", {
              timeZone: "Asia/Tehran",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })} (به وقت تهران)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>روزآمدی بازار:</span>
          <span className="text-emerald-400 font-bold">کاملاً بروز (Real-time)</span>
        </div>
      </div>

      {/* Trade Timing & Execution Horizon Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-indigo-800/40 rounded-xl p-3.5 my-3 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Horizon */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">افق زمانی ورود و خروج:</span>
              <span className="text-slate-100 font-bold">
                {setup.timing?.horizonLabelFa || (setup.timeframe === '1m' || setup.timeframe === '5m' || setup.timeframe === '15m' ? '⚡ اسکلپ سریع (۵ الی ۳۰ دقیقه)' : setup.timeframe === '1h' || setup.timeframe === '4h' ? '⏱️ درون‌روز (۱ الی ۴ ساعت)' : '📅 سوینگ چندروزه (۱ الی ۳ روز)')}
              </span>
            </div>
          </div>

          {/* Entry Window */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">اعتبار محدوده ورود:</span>
              <span className="text-blue-300 font-semibold">
                {setup.timing?.entryValidityWindowFa || 'معتبر تا ۳۰ الی ۶۰ دقیقه آینده'}
              </span>
            </div>
          </div>

          {/* Holding Duration */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Hourglass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">مدت تخمینی نگهداری:</span>
              <span className="text-emerald-300 font-semibold">
                {setup.timing?.estimatedHoldingTimeFa || '۱۵ الی ۴۵ دقیقه'}
              </span>
            </div>
          </div>

          {/* Invalidation Timeout */}
          {setup.timing?.invalidationTimeoutFa && (
            <div className="w-full text-[11px] text-slate-400 pt-2 border-t border-indigo-900/40 flex items-center justify-between">
              <span className="text-amber-400/90 flex items-center gap-1">
                <span>⚠️ شرط انقضای زمانی:</span>
                <span>{setup.timing.invalidationTimeoutFa}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Price Grid (Entry, TP Targets, Stop Loss, Leverage) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        {/* Entry Zone */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              محدوده ورود (Entry)
            </span>
            <span className="text-[10px] text-slate-500">قیمت لحظه‌ای: ${setup.currentPrice.toLocaleString()}</span>
          </div>
          <div className="mono-num text-base font-bold text-slate-100">
            ${setup.entryZone[0].toLocaleString()} - ${setup.entryZone[1].toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>نقطه بهینه:</span>
            <span className="mono-num text-emerald-400 font-semibold">${setup.optimalEntry.toLocaleString()}</span>
          </div>
        </div>

        {/* Take Profit Targets with Estimated Times */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              تارگت‌های سود (TPs)
            </span>
            <span className="text-[10px] text-slate-400">۳ پله خروج</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {setup.takeProfits.map((tp) => (
              <div key={tp.target} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">TP{tp.target}:</span>
                  <span className="mono-num font-bold text-emerald-300">${tp.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {tp.estimatedTimeFa && (
                    <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                      ~{tp.estimatedTimeFa}
                    </span>
                  )}
                  <span className="mono-num text-[11px] text-emerald-400 font-medium">+{tp.pnlPercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stop Loss */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              حد ضرر (Stop Loss)
            </span>
            <span className="mono-num text-[11px] text-rose-400 font-semibold">{setup.stopLoss.lossPercent}%</span>
          </div>
          <div className="mono-num text-base font-bold text-rose-400">${setup.stopLoss.price.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate" title={setup.stopLoss.invalidationReasonFa}>
            {setup.stopLoss.invalidationReasonFa}
          </div>
        </div>

        {/* Leverage & Risk Reward */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              اهرم و نسبت RR
            </span>
            <span className="text-[10px] text-purple-300 font-semibold">1:2 Risk Formula</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div>
              <span className="text-[10px] text-slate-500 block">لوریج پیشنهادی:</span>
              <span className="mono-num text-sm font-bold text-purple-300">{setup.recommendedLeverage}</span>
            </div>
            <div className="text-left">
              <span className="text-[10px] text-slate-500 block">ریسک به ریوارد:</span>
              <span className="mono-num text-sm font-bold text-emerald-400">1:{setup.riskRewardRatio}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Applied Knowledge Rules (if offline engine) */}
      {setup.knowledgeBaseRulesApplied && setup.knowledgeBaseRulesApplied.length > 0 && (
        <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-xl p-3.5 my-3">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-cyan-300">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>قوانین و همپوشانی‌های تایید شده در دانشنامه معاملاتی:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {setup.knowledgeBaseRulesApplied.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persian AI Analysis Commentary */}
      <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4 my-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">تحلیل تکنیکال و استراتژی پرایس‌اکشن:</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('fa')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'fa' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              تحلیل فارسی
            </button>
            {setup.educationalNotesFa && (
              <button
                onClick={() => setActiveTab('edu')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'edu' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📚 آموزش ستاپ
              </button>
            )}
            <button
              onClick={() => setActiveTab('en')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'en' ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'raw' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              متن بات
            </button>
          </div>
        </div>

        {activeTab === 'fa' && (
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed text-justify">
            {setup.analysisFa}
          </p>
        )}

        {activeTab === 'edu' && (
          <div className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/80 p-3 rounded-lg border border-cyan-900/40">
            {setup.educationalNotesFa}
          </div>
        )}

        {activeTab === 'en' && (
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans text-left dir-ltr">
            {setup.analysisEn}
          </p>
        )}

        {activeTab === 'raw' && (
          <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {setup.telegramMessage}
          </pre>
        )}

        {/* Technical Indicators Dropdown */}
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              جزییات اندیکاتورها (RSI, MACD, EMAs, Order Blocks)
            </span>
            {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTechnicalDetails && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2.5 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">شاخص RSI:</span>
                <span className="mono-num font-bold text-slate-200">{setup.indicatorsSummary.rsi}</span>
                <span className="text-[10px] text-emerald-400 block">{setup.indicatorsSummary.rsiCondition}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">موقعیت MACD:</span>
                <span className="font-semibold text-slate-200 text-[11px] truncate block">
                  {setup.indicatorsSummary.macd}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">روند میانگین‌های متحرک:</span>
                <span className="font-semibold text-slate-200 text-[11px] truncate block">
                  {setup.indicatorsSummary.emaTrend}
                </span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">ناحیه نقدینگی و بلوک سفارش:</span>
                <span className="font-semibold text-amber-300 text-[11px] truncate block">
                  {setup.indicatorsSummary.orderBlocks || 'Zone Retest'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Send to Telegram */}
          <button
            id={`send-tg-${setup.id}`}
            onClick={() => onSendToTelegram(setup)}
            className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            ارسال به بات تلگرام
          </button>

          {/* Send to Bale */}
          <button
            id={`send-bale-${setup.id}`}
            onClick={() => onSendToBale(setup)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            ارسال به بات بله
          </button>

          {/* Copy Message */}
          <button
            id={`copy-msg-${setup.id}`}
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'کپی شد!' : 'کپی سیگنال'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Calculator */}
          {onOpenCalculator && (
            <button
              id={`calc-${setup.id}`}
              onClick={() => onOpenCalculator(setup)}
              className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              محاسبه حجم و سود
            </button>
          )}

          {/* Journal */}
          {onSaveToJournal && (
            <button
              id={`journal-${setup.id}`}
              onClick={() => onSaveToJournal(setup)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              ثبت در ژورنال
            </button>
          )}
        </div>
      </div>

      {/* Legal & Liability Notice Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 text-center sm:text-right">
          <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>مسئولیت ریسک و ورود به معامله ۱۰۰٪ بر عهده کاربر است. هیچ سودی به سازنده تعلق نمی‌گیرد.</span>
        </div>
        {onOpenLegal && (
          <button
            onClick={onOpenLegal}
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-medium shrink-0"
          >
            مشاهده متن کامل قوانین و سلب مسئولیت
          </button>
        )}
      </div>
    </div>
  );
};
