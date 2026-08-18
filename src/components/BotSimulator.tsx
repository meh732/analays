import React, { useState, useRef, useEffect } from 'react';
import { BotMessage, InlineButton } from '../types';
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
} from 'lucide-react';

interface BotSimulatorProps {
  platform: 'telegram' | 'bale';
  onPlatformChange: (p: 'telegram' | 'bale') => void;
  messages: BotMessage[];
  onSendMessage: (text: string, platform: 'telegram' | 'bale') => Promise<void>;
  isLoading: boolean;
  onOpenConfig: () => void;
  onOpenLegal?: () => void;
}

export const BotSimulator: React.FC<BotSimulatorProps> = ({
  platform,
  onPlatformChange,
  messages,
  onSendMessage,
  isLoading,
  onOpenConfig,
  onOpenLegal,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showBottomMenu, setShowBottomMenu] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTelegram = platform === 'telegram';

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

  return (
    <div className="w-full flex flex-col h-[700px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Bot Header with Platform Switcher */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between transition-colors ${
          isTelegram
            ? 'bg-slate-900 border-sky-500/30'
            : 'bg-slate-900 border-emerald-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${
              isTelegram ? 'bg-sky-500 shadow-sky-500/30' : 'bg-emerald-600 shadow-emerald-600/30'
            }`}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                {isTelegram ? 'TradingView Signal AI (Telegram Bot)' : 'ربات هوشمند تریدینگ‌ویو (پیام‌رسان بله)'}
              </span>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                آنلاین • دکمه‌های شیشه‌ای فعال
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
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
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
              title="قوانین، شرایط استفاده و سلب مسئولیت حقوقی"
            >
              <Scale className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">قوانین و مسئولیت</span>
            </button>
          )}

          <button
            id="bot-config-btn"
            onClick={onOpenConfig}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
            title="تنظیمات سوددهی، ریسک و توکن بات"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">تنظیم سود و ریسک</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/70 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4 max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <Sparkles className="w-7 h-7 text-emerald-400" />
            </div>
            <h4 className="font-bold text-slate-200 text-sm mb-1">
              ربات تریدینگ‌ویو آماده دریافت دستورات و تحلیل
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              روی دکمه‌های شیشه‌ای زیر کلیک کنید یا نماد مورد نظرتان را بنویسید (مثلاً: <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400">BTCUSDT 15m</code>).
            </p>
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
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
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
              <div className="max-w-[88%] space-y-2">
                <div
                  className={`rounded-2xl p-3.5 text-xs shadow-md ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : isTelegram
                      ? 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none backdrop-blur-md'
                      : 'bg-slate-900/90 border border-emerald-950/80 text-slate-200 rounded-tl-none backdrop-blur-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed font-sans select-text">
                    {msg.text}
                  </div>

                  {/* Footer timestamp & copy */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                    <span>{new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-slate-200 flex items-center gap-1 transition-colors"
                        title="کپی پیام"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">کپی شد</span>
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

                {/* Glass-Style Inline Keyboards (دکمه‌های شیشه‌ای زیر پیام ربات) */}
                {msg.inlineKeyboard && msg.inlineKeyboard.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    {msg.inlineKeyboard.map((row, rowIdx) => (
                      <div key={rowIdx} className="grid grid-flow-col auto-cols-fr gap-1.5">
                        {row.map((btn, btnIdx) => (
                          btn.url ? (
                            <a
                              key={btnIdx}
                              href={btn.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 backdrop-blur-md border border-slate-700/60 text-slate-200 text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1 shadow-sm active:scale-95"
                            >
                              <span>{btn.text}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          ) : (
                            <button
                              key={btnIdx}
                              onClick={() => handleCommandClick(btn.callback_data || btn.text)}
                              disabled={isLoading}
                              className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-emerald-950/60 hover:border-emerald-500/40 backdrop-blur-md border border-slate-700/70 text-slate-100 text-[11px] font-semibold transition-all text-center shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              {btn.text}
                            </button>
                          )
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Legacy single row buttons fallback */}
                {(!msg.inlineKeyboard || msg.inlineKeyboard.length === 0) && msg.buttons && msg.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {msg.buttons.map((btn, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCommandClick(btn.callback_data || btn.text)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 backdrop-blur-md border border-slate-700 text-slate-200 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-50"
                      >
                        {btn.text}
                      </button>
                    ))}
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
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs text-white ${
                isTelegram ? 'bg-sky-500' : 'bg-emerald-600'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-300 flex items-center gap-2 backdrop-blur-md">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>ربات در حال بررسی لایو تریدینگ‌ویو و تولید دکمه‌های شیشه‌ای...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Persistent Glass Menu Drawer (منوی شیشه‌ای زیر قسمت چت) */}
      <div className="bg-slate-900 border-t border-slate-800">
        {/* Menu Header Bar */}
        <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span>منوی هوشمند زیر چت (Glass Keyboard Menu)</span>
          </div>
          <button
            onClick={() => setShowBottomMenu(!showBottomMenu)}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>{showBottomMenu ? 'بستن منو' : 'باز کردن منو'}</span>
            {showBottomMenu ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Glass Menu Buttons Grid */}
        {showBottomMenu && (
          <div className="p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
            <button
              onClick={() => handleCommandClick('/scanner')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/70 to-slate-900 hover:from-emerald-900/80 hover:to-slate-800 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>🔍 اسکنر ستاپ طلایی A+</span>
            </button>

            <button
              onClick={() => handleCommandClick('⚡ ستاپ سریع بیت‌کوین (BTC)')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-amber-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>⚡ تحلیل فوری بیت‌کوین</span>
            </button>

            <button
              onClick={() => handleCommandClick('⚡ ستاپ سریع اتریوم (ETH)')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-blue-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-blue-400" />
              <span>⚡ تحلیل فوری اتریوم</span>
            </button>

            <button
              onClick={() => handleCommandClick('⚡ ستاپ انس طلا (XAUUSD)')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-yellow-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Activity className="w-4 h-4 text-yellow-400" />
              <span>🥇 تحلیل فوری انس طلا</span>
            </button>

            <button
              onClick={() => handleCommandClick('📊 واچ‌لیست رصد لحظه‌ای')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-purple-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Radar className="w-4 h-4 text-purple-400" />
              <span>📊 واچ‌لیست رصد لحظه‌ای</span>
            </button>

            <button
              onClick={() => handleCommandClick('🛡️ تنظیمات سود و ریسک')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-teal-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>🛡️ تنظیم سود و ریسک</span>
            </button>

            <button
              onClick={() => handleCommandClick('🌐 بازار فارکس و سهام آمریکا')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-sky-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Globe className="w-4 h-4 text-sky-400" />
              <span>🌐 سهام آمریکا و فارکس</span>
            </button>

            <button
              onClick={() => handleCommandClick('🎯 بهترین ستاپ فیوچرز الان')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-rose-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <TrendingUp className="w-4 h-4 text-rose-400" />
              <span>🎯 ستاپ فیوچرز داغ الان</span>
            </button>

            <button
              onClick={() => {
                if (onOpenLegal) {
                  onOpenLegal();
                } else {
                  handleCommandClick('/rules');
                }
              }}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Scale className="w-4 h-4 text-amber-400" />
              <span>⚖️ قوانین و سلب مسئولیت</span>
            </button>

            <button
              onClick={() => handleCommandClick('/start')}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Menu className="w-4 h-4 text-slate-400" />
              <span>📋 بازگشت به منوی اصلی</span>
            </button>
          </div>
        )}

        {/* Input Message Form */}
        <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBottomMenu(!showBottomMenu)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all flex items-center justify-center"
            title="نمایش / مخفی‌سازی منوی زیر چت"
          >
            <Grid className="w-4 h-4 text-emerald-400" />
          </button>

          <input
            id="bot-chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isTelegram
                ? 'پیام، دستور یا نماد را بنویسید (مثلاً: /analyze BTCUSDT 15m یا کلیک روی دکمه‌ها)...'
                : 'دستور یا نماد را بنویسید (مثلاً: تحلیل طلا فیوچرز یا کلیک روی منو)...'
            }
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />

          <button
            id="bot-chat-submit"
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-2.5 rounded-xl font-bold transition-all text-white flex items-center justify-center ${
              !inputText.trim() || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : isTelegram
                ? 'bg-sky-500 hover:bg-sky-600 shadow-md shadow-sky-950 active:scale-95'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-950 active:scale-95'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
