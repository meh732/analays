import React, { useState, useRef, useEffect } from 'react';
import { BotConfig, BotMessage, InlineButton } from '../types';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Sliders,
  Radar,
  Grid,
  Menu,
  ChevronUp,
  ChevronDown,
  Layers,
  Activity,
  Globe,
  Scale,
  Brain,
  Calculator,
  Search,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface BotSimulatorProps {
  platform: 'telegram' | 'bale';
  onPlatformChange: (p: 'telegram' | 'bale') => void;
  messages: BotMessage[];
  onSendMessage: (text: string, platform: 'telegram' | 'bale') => Promise<void>;
  isLoading: boolean;
  onOpenConfig: () => void;
  onOpenLegal?: () => void;
  config?: BotConfig;
}

export const BotSimulator: React.FC<BotSimulatorProps> = ({
  platform,
  onPlatformChange,
  messages,
  onSendMessage,
  isLoading,
  onOpenConfig,
  onOpenLegal,
  config,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showBottomMenu, setShowBottomMenu] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTelegram = platform === 'telegram';
  const isAiEnabled = config?.enableAiEngine !== false;
  const isOfflineEnabled = config?.enableOfflineEngine !== false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    onSendMessage(text, platform);
  };

  const handleCommandClick = (cmdOrText: string) => {
    if (isLoading) return;
    onSendMessage(cmdOrText, platform);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Modern Telegram Glass Dynamic Theme Generator
  const getGlassStyle = (text: string, style?: string) => {
    const t = text.toLowerCase();
    
    // Success / Agree / Long / Safe Green Glass
    if (style === 'success' || t.includes('موافق') || t.includes('تایید') || t.includes('long') || t.includes('لانگ') || t.includes('online')) {
      return 'bg-emerald-950/85 hover:bg-emerald-900/95 text-emerald-100 border-2 border-emerald-500/70 shadow-[0_4px_18px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_24px_rgba(16,185,129,0.5)]';
    }
    
    // Danger / Short / Remove Rose Glass
    if (style === 'danger' || t.includes('حذف') || t.includes('remove') || t.includes('short') || t.includes('شورت') || t.includes('خروج') || t.includes('ضرر') || t.includes('stop')) {
      return 'bg-rose-950/85 hover:bg-rose-900/95 text-rose-100 border-2 border-rose-500/70 shadow-[0_4px_18px_rgba(244,63,94,0.35)] hover:shadow-[0_6px_24px_rgba(244,63,94,0.5)]';
    }
    
    // Amber / Gold / Rules / BTC / Admin Glass
    if (style === 'warning' || t.includes('قوانین') || t.includes('مسئولیت') || t.includes('btc') || t.includes('بیت') || t.includes('طلا') || t.includes('xau') || t.includes('ادمین') || t.includes('admin') || t.includes('مدیریت')) {
      return 'bg-amber-950/85 hover:bg-amber-900/95 text-amber-100 border-2 border-amber-500/70 shadow-[0_4px_18px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_24px_rgba(245,158,11,0.5)]';
    }
    
    // Indigo / AI / Hunter / Calc Glass
    if (t.includes('هوش مصنوعی') || t.includes('hunter') || t.includes('شکارچی') || t.includes('sol') || t.includes('حجم') || t.includes('calc') || t.includes('مارجین') || t.includes('position')) {
      return 'bg-indigo-950/85 hover:bg-indigo-900/95 text-indigo-100 border-2 border-indigo-500/70 shadow-[0_4px_18px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.5)]';
    }
    
    // Cyan / SMC / Offline / ETH / Scanner Glass
    if (t.includes('آفلاین') || t.includes('offline') || t.includes('smc') || t.includes('اتریوم') || t.includes('eth') || t.includes('اسکنر') || t.includes('scanner') || t.includes('دیده‌بان') || t.includes('watchlist') || t.includes('افزودن')) {
      return 'bg-cyan-950/85 hover:bg-cyan-900/95 text-cyan-100 border-2 border-cyan-500/70 shadow-[0_4px_18px_rgba(6,182,212,0.35)] hover:shadow-[0_6px_24px_rgba(6,182,212,0.5)]';
    }
    
    // Default Telegram Sky Blue Glass
    return 'bg-sky-950/85 hover:bg-sky-900/95 text-sky-100 border-2 border-sky-500/70 shadow-[0_4px_18px_rgba(14,165,233,0.35)] hover:shadow-[0_6px_24px_rgba(14,165,233,0.5)]';
  };

  return (
    <div className="w-full flex flex-col h-[740px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Bot Header with Platform Switcher */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between transition-colors ${
          isTelegram
            ? 'bg-slate-900/95 border-sky-500/30'
            : 'bg-slate-900/95 border-emerald-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${
              isTelegram ? 'bg-gradient-to-tr from-sky-600 to-blue-500 shadow-sky-500/20' : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/20'
            }`}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                {isTelegram ? 'TradingView Signal AI (Telegram Bot)' : 'ربات هوشمند تریدینگ‌ویو (پیام‌رسان بله)'}
              </span>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                آنلاین • کیبورد شیشه‌ای
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block font-['Plus_Jakarta_Sans',sans-serif]">
              {isTelegram ? '@TradingViewSignalAI_Bot' : 'bale.ai/bot/TradingView_Signal_Bot'}
            </span>
          </div>
        </div>

        {/* Platform Selector & Setup Config */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              id="switch-to-telegram"
              onClick={() => onPlatformChange('telegram')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isTelegram
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>تلگرام</span>
            </button>
            <button
              id="switch-to-bale"
              onClick={() => onPlatformChange('bale')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isTelegram
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>بله (Bale)</span>
            </button>
          </div>

          {onOpenLegal && (
            <button
              id="bot-legal-rules-btn"
              onClick={onOpenLegal}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700/80 transition-all flex items-center gap-1.5 shadow-sm"
              title="قوانین، شرایط استفاده و سلب مسئولیت حقوقی"
            >
              <Scale className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">قوانین و مسئولیت</span>
            </button>
          )}

          <button
            id="bot-config-btn"
            onClick={onOpenConfig}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/80 transition-all flex items-center gap-1.5 shadow-sm"
            title="تنظیمات سوددهی، ریسک و توکن بات"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">تنظیم سود و ریسک</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/80 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {messages.length === 0 && (
          <div className="text-center py-10 px-4 max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 shadow-xl shadow-slate-950">
              <Bot className="w-8 h-8 text-sky-400 animate-bounce duration-1000" />
            </div>
            <h4 className="font-black text-slate-100 text-base mb-2">
              شروع کار با ربات هوشمند تریدینگ‌ویو
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              طبق قوانین بازارهای مالی، با شروع ربات ابتدا صفحه شرایط و سلب مسئولیت نمایش داده شده و با تأیید آن، تمام امکانات فعال می‌گردند.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => handleCommandClick('/start')}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>🚀 شروع ربات و نمایش قوانین (/start)</span>
              </button>
              <button
                onClick={() => handleCommandClick('/rules')}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Scale className="w-4 h-4 text-amber-400" />
                <span>⚖️ مطالعه قوانین کامل</span>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : isTelegram
                    ? 'bg-sky-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Bubble Container */}
              <div className="max-w-[90%] space-y-2">
                <div
                  className={`rounded-2xl p-4 text-xs shadow-md ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : isTelegram
                      ? 'bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-tl-none backdrop-blur-md'
                      : 'bg-slate-900/90 border border-emerald-950/80 text-slate-200 rounded-tl-none backdrop-blur-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed font-sans select-text">
                    {msg.text}
                  </div>

                  {/* Footer timestamp & copy */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>{new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-slate-200 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800"
                        title="کپی پیام"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">کپی شد</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>کپی متن</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Telegram Modern Glass-Style Inline Keyboards (دکمه‌های شیشه‌ای رنگی داخل چت) */}
                {msg.inlineKeyboard && msg.inlineKeyboard.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    {msg.inlineKeyboard.map((row, rowIdx) => (
                      <div key={rowIdx} className="grid grid-flow-col auto-cols-fr gap-1.5">
                        {row.map((btn, btnIdx) => {
                          const glassClass = getGlassStyle(btn.text, btn.style);
                          return btn.url ? (
                            <a
                              key={btnIdx}
                              href={btn.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`px-3 py-2.5 rounded-xl backdrop-blur-xl border text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1.5 active:scale-95 ${glassClass}`}
                            >
                              <span>{btn.text}</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </a>
                          ) : (
                            <button
                              key={btnIdx}
                              onClick={() => handleCommandClick(btn.callback_data || btn.text)}
                              disabled={isLoading}
                              className={`px-3 py-2.5 rounded-xl backdrop-blur-xl border text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 ${glassClass}`}
                            >
                              <span>{btn.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {/* Legacy single row buttons fallback */}
                {(!msg.inlineKeyboard || msg.inlineKeyboard.length === 0) && msg.buttons && msg.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {msg.buttons.map((btn, idx) => {
                      const glassClass = getGlassStyle(btn.text, btn.style);
                      return (
                        <button
                          key={idx}
                          onClick={() => handleCommandClick(btn.callback_data || btn.text)}
                          disabled={isLoading}
                          className={`px-3 py-1.5 rounded-xl backdrop-blur-xl border text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 ${glassClass}`}
                        >
                          {btn.text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs text-white ${
                isTelegram ? 'bg-sky-500' : 'bg-emerald-600'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-300 flex items-center gap-2 backdrop-blur-md">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>ربات در حال استخراج دیتای زنده و تولید پاسخ شیشه‌ای...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Persistent Glass Menu Drawer (دکمه‌های زیر نوار چت با قابلیت باز و بسته شدن) */}
      <div className="bg-slate-900/95 border-t border-slate-800 relative z-10">
        {/* Input Message Form with Integrated 4-Square Menu Toggle */}
        <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2">
          {/* Telegram 4-Squares Toggle Button (دکمه مربع تلگرامی داخل نوار چت برای بالا و پایین کردن دکمه‌ها) */}
          <button
            type="button"
            id="toggle-reply-keyboard-btn"
            onClick={() => {
              const nextState = !showBottomMenu;
              setShowBottomMenu(nextState);
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center active:scale-95 ${
              showBottomMenu
                ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-[0_0_15px_rgba(14,165,233,0.4)] ring-1 ring-sky-400/50'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
            title={showBottomMenu ? 'بستن منوی دکمه‌های زیر چت' : 'نمایش و باز کردن منوی دکمه‌های شیشه‌ای'}
          >
            <Grid className={`w-4 h-4 transition-transform duration-300 ${showBottomMenu ? 'rotate-90 text-sky-300' : ''}`} />
          </button>

          <input
            id="bot-chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isTelegram
                ? 'پیام یا دستور را بنویسید (مثلاً: /analyze BTCUSDT 15m یا کلیک روی دکمه‌ها)...'
                : 'دستور یا نماد را بنویسید (مثلاً: تحلیل طلا فیوچرز یا کلیک روی دکمه‌ها)...'
            }
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-sans"
          />

          <button
            id="bot-chat-submit"
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-2.5 rounded-xl font-bold transition-all text-white flex items-center justify-center ${
              !inputText.trim() || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : isTelegram
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-md shadow-sky-950 active:scale-95'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950 active:scale-95'
            }`}
            title="ارسال پیام"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Telegram Reply Keyboard Glass Buttons (نمایش با انیمیشن روان و دکمه‌های شیشه‌ای رنگی و باکیفیت) */}
        {showBottomMenu && (
          <div className="p-3 bg-slate-950/98 backdrop-blur-xl animate-in slide-in-from-bottom-2 fade-in duration-200 border-t border-slate-800/90 shadow-2xl">
            {/* Subheader status bar */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80 text-[11px]">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <Grid className="w-3.5 h-3.5 text-sky-400" />
                <span>منوی دسترسی سریع تلگرامی (Glass Reply Keyboard):</span>
                {!isAiEnabled && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    هوش مصنوعی غیرفعال
                  </span>
                )}
                {!isOfflineEnabled && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    دانش آفلاین غیرفعال
                  </span>
                )}
              </span>
              <button
                onClick={() => {
                  setShowBottomMenu(false);
                }}
                className="text-slate-400 hover:text-slate-100 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-colors"
                title="بستن کیبورد"
              >
                <span>بستن منو</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* 1. Emerald / Scanner */}
              <button
                onClick={() => handleCommandClick('🎯 اسکنر هوشمند بازار')}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900/90 border-2 border-emerald-500/60 text-emerald-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_28px_rgba(16,185,129,0.5)] active:scale-95 disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500/30 flex items-center justify-center shrink-0 border border-emerald-400/60 text-emerald-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="truncate font-bold">🎯 اسکنر هوشمند</span>
              </button>

              {/* 2. Online AI Button */}
              {isAiEnabled && (
                <button
                  onClick={() => handleCommandClick('🧠 تحلیل هوش مصنوعی')}
                  disabled={isLoading}
                  className="p-3 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900/90 border-2 border-indigo-500/60 text-indigo-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.5)] active:scale-95 disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/30 flex items-center justify-center shrink-0 border border-indigo-400/60 text-indigo-300">
                    <Brain className="w-4 h-4" />
                  </div>
                  <span className="truncate font-bold">🧠 تحلیل هوش مصنوعی</span>
                </button>
              )}

              {/* 3. Offline SMC Button */}
              {isOfflineEnabled && (
                <button
                  onClick={() => handleCommandClick('📚 استراتژی آفلاین SMC')}
                  disabled={isLoading}
                  className="p-3 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900/90 border-2 border-cyan-500/60 text-cyan-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(6,182,212,0.35)] hover:shadow-[0_6px_28px_rgba(6,182,212,0.5)] active:scale-95 disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-xl bg-cyan-500/30 flex items-center justify-center shrink-0 border border-cyan-400/60 text-cyan-300">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="truncate font-bold">📚 استراتژی آفلاین SMC</span>
                </button>
              )}

              {/* 4. Amber / Quick Crypto */}
              <button
                onClick={() => handleCommandClick('📊 تحلیل فوری ارزها')}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-amber-950/80 hover:bg-amber-900/90 border-2 border-amber-500/60 text-amber-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.5)] active:scale-95 disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/30 flex items-center justify-center shrink-0 border border-amber-400/60 text-amber-300">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="truncate font-bold">📊 تحلیل فوری ارزها</span>
              </button>

              {/* 5. Fuchsia / Position & Margin Calculator */}
              <button
                onClick={() => handleCommandClick('🧮 محاسبه حجم و مارجین')}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-fuchsia-950/80 hover:bg-fuchsia-900/90 border-2 border-fuchsia-500/60 text-fuchsia-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(217,70,239,0.35)] hover:shadow-[0_6px_28px_rgba(217,70,239,0.5)] active:scale-95 disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-xl bg-fuchsia-500/30 flex items-center justify-center shrink-0 border border-fuchsia-400/60 text-fuchsia-300">
                  <Calculator className="w-4 h-4" />
                </div>
                <span className="truncate font-bold">🧮 محاسبه حجم و مارجین</span>
              </button>

              {/* 6. Sky Blue / Risk Settings */}
              <button
                onClick={() => handleCommandClick('⚙️ تنظیمات ریسک و سود')}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-sky-950/80 hover:bg-sky-900/90 border-2 border-sky-500/60 text-sky-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(14,165,233,0.35)] hover:shadow-[0_6px_28px_rgba(14,165,233,0.5)] active:scale-95 disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-xl bg-sky-500/30 flex items-center justify-center shrink-0 border border-sky-400/60 text-sky-300">
                  <Sliders className="w-4 h-4" />
                </div>
                <span className="truncate font-bold">⚙️ تنظیمات ریسک</span>
              </button>

              {/* 7. Mint Teal / Watchlist */}
              <button
                onClick={() => handleCommandClick('🔍 واچ‌لیست دیده‌بان')}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-teal-950/80 hover:bg-teal-900/90 border-2 border-teal-500/60 text-teal-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(20,184,166,0.35)] hover:shadow-[0_6px_28px_rgba(20,184,166,0.5)] active:scale-95 disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-xl bg-teal-500/30 flex items-center justify-center shrink-0 border border-teal-400/60 text-teal-300">
                  <Radar className="w-4 h-4" />
                </div>
                <span className="truncate font-bold">🔍 واچ‌لیست دیده‌بان</span>
              </button>

              {/* 8. Royal Blue / History & Journal */}
              <button
                onClick={() => handleCommandClick('📂 تاریخچه و ژورنال')}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-blue-950/80 hover:bg-blue-900/90 border-2 border-blue-500/60 text-blue-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.5)] active:scale-95 disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-xl bg-blue-500/30 flex items-center justify-center shrink-0 border border-blue-400/60 text-blue-300">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="truncate font-bold">📂 تاریخچه و ژورنال</span>
              </button>

              {/* 9. Golden Orange / Terms & Legal Rules */}
              <button
                onClick={() => handleCommandClick('⚖️ قوانین و سلب مسئولیت حقوقی')}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-orange-950/80 hover:bg-orange-900/90 border-2 border-orange-500/60 text-orange-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_20px_rgba(249,115,22,0.35)] hover:shadow-[0_6px_28px_rgba(249,115,22,0.5)] active:scale-95 disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-xl bg-orange-500/30 flex items-center justify-center shrink-0 border border-orange-400/60 text-orange-300">
                  <Scale className="w-4 h-4" />
                </div>
                <span className="truncate font-bold">⚖️ قوانین حقوقی</span>
              </button>

              {/* 10. Gold & Amber / Admin Settings Panel */}
              <button
                onClick={() => handleCommandClick('👑 پنل مدیریت ادمین')}
                disabled={isLoading}
                className="p-3 rounded-2xl bg-amber-950/90 hover:bg-amber-900/95 border-2 border-amber-400 text-amber-100 text-xs font-black transition-all flex items-center gap-2.5 shadow-[0_4px_22px_rgba(245,158,11,0.45)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.6)] active:scale-95 disabled:opacity-50 col-span-2 sm:col-span-3 justify-center"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/30 flex items-center justify-center shrink-0 border border-amber-300 text-amber-300">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="truncate font-bold text-sm">👑 پنل مدیریت ادمین (Admin Panel)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
