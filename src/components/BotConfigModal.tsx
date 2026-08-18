import React, { useState } from 'react';
import { BotConfig, RiskProfileMode, SetupGrade } from '../types';
import {
  X,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Sliders,
  Radar,
  TrendingUp,
  Percent,
  Plus,
  Trash2,
  Lock,
  Brain,
  Layers,
  Sparkles,
  Cpu,
} from 'lucide-react';

interface BotConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BotConfig;
  onSaveConfig: (newConfig: BotConfig) => void;
  onTestConnection: (platform: 'telegram' | 'bale', token: string, chatId: string) => Promise<{ success: boolean; error?: string }>;
}

export const BotConfigModal: React.FC<BotConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTestConnection,
}) => {
  const [formData, setFormData] = useState<BotConfig>({
    ...config,
    enableAiEngine: config.enableAiEngine !== undefined ? config.enableAiEngine : true,
    enableOfflineEngine: config.enableOfflineEngine !== undefined ? config.enableOfflineEngine : true,
    defaultEngineMode: config.defaultEngineMode || 'ONLINE_AI',
  });
  const [activeTab, setActiveTab] = useState<'engines' | 'risk' | 'auto_hunter' | 'telegram' | 'bale'>('engines');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [engineWarning, setEngineWarning] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : '';
  const telegramWebhookUrl = `${currentHost}/api/bot/webhook/telegram`;
  const baleWebhookUrl = `${currentHost}/api/bot/webhook/bale`;

  const handleToggleAi = () => {
    setEngineWarning(null);
    const nextAiState = !formData.enableAiEngine;
    if (!nextAiState && !formData.enableOfflineEngine) {
      setEngineWarning('⚠️ حداقل یک موتور تحلیلی (هوش مصنوعی یا دانش آفلاین) باید فعال باشد.');
      return;
    }
    const nextDefault = !nextAiState ? 'OFFLINE_RULES' : formData.defaultEngineMode;
    setFormData({
      ...formData,
      enableAiEngine: nextAiState,
      defaultEngineMode: nextDefault,
    });
  };

  const handleToggleOffline = () => {
    setEngineWarning(null);
    const nextOfflineState = !formData.enableOfflineEngine;
    if (!nextOfflineState && !formData.enableAiEngine) {
      setEngineWarning('⚠️ حداقل یک موتور تحلیلی (هوش مصنوعی یا دانش آفلاین) باید فعال باشد.');
      return;
    }
    const nextDefault = !nextOfflineState ? 'ONLINE_AI' : formData.defaultEngineMode;
    setFormData({
      ...formData,
      enableOfflineEngine: nextOfflineState,
      defaultEngineMode: nextDefault,
    });
  };

  const handleTest = async () => {
    const platform = activeTab === 'telegram' ? 'telegram' : 'bale';
    setIsTesting(true);
    setTestResult(null);
    try {
      const token = platform === 'telegram' ? formData.telegramToken : formData.baleToken;
      const chatId = platform === 'telegram' ? formData.telegramChatId : formData.baleChatId;

      if (!token || !chatId) {
        setTestResult({
          success: false,
          message: 'لطفاً توکن ربات و Chat ID را در تب مربوطه وارد کنید.',
        });
        setIsTesting(false);
        return;
      }

      const res = await onTestConnection(platform, token, chatId);
      if (res.success) {
        setTestResult({
          success: true,
          message: 'پیام تستی با موفقیت به ربات ارسال شد! اتصال برقرار است.',
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'خطا در برقراری ارتباط با سرور بات.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'خطای اتصال شبکه',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const addWatchlistSymbol = () => {
    if (!newSymbolInput.trim()) return;
    const cleanSym = newSymbolInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanSym && !formData.autoHunter.watchlist.includes(cleanSym)) {
      setFormData({
        ...formData,
        autoHunter: {
          ...formData.autoHunter,
          watchlist: [...formData.autoHunter.watchlist, cleanSym],
        },
      });
      setNewSymbolInput('');
    }
  };

  const removeWatchlistSymbol = (sym: string) => {
    setFormData({
      ...formData,
      autoHunter: {
        ...formData.autoHunter,
        watchlist: formData.autoHunter.watchlist.filter((s) => s !== sym),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                تنظیمات ادمین و پیکربندی موتورهای هوش مصنوعی و ربات‌ها
              </h3>
              <p className="text-[11px] text-slate-400">
                کنترل فعال/غیرفعال‌سازی هوش مصنوعی، دانش آفلاین، ریسک و اتصالات تلگرام و بله
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs overflow-x-auto scrollbar-none">
          <button
            id="tab-engines-settings"
            onClick={() => { setActiveTab('engines'); setTestResult(null); setEngineWarning(null); }}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'engines'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>موتورهای تحلیلی (AI و آفلاین)</span>
          </button>

          <button
            id="tab-risk-settings"
            onClick={() => { setActiveTab('risk'); setTestResult(null); setEngineWarning(null); }}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'risk'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>سوددهی و ریسک</span>
          </button>

          <button
            id="tab-auto-hunter"
            onClick={() => { setActiveTab('auto_hunter'); setTestResult(null); setEngineWarning(null); }}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'auto_hunter'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>شکارچی خودکار</span>
          </button>

          <button
            id="tab-telegram-bot"
            onClick={() => { setActiveTab('telegram'); setTestResult(null); setEngineWarning(null); }}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'telegram'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>ربات تلگرام</span>
          </button>

          <button
            id="tab-bale-bot"
            onClick={() => { setActiveTab('bale'); setTestResult(null); setEngineWarning(null); }}
            className={`flex-1 py-3 px-3 font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'bale'
                ? 'border-emerald-600 text-emerald-300 bg-emerald-600/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>ربات بله</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 0. ENGINES MANAGEMENT TAB (AI VS OFFLINE) */}
          {activeTab === 'engines' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    مدیریت فعال‌سازی موتورهای تحلیل تکنیکال سیستم:
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    کنترل دسترسی در وب، تلگرام و بله
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  می‌توانید هر یک از موتورهای تولید ستاپ معاملاتی را فعال یا غیرفعال کنید. اگر یکی از حالت‌ها خاموش شود، ربات‌ها و پنل به طور خودکار به حالت فعال دیگر سوییچ می‌کنند.
                </p>

                {engineWarning && (
                  <div className="p-3 rounded-xl border bg-amber-500/15 border-amber-500/30 text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{engineWarning}</span>
                  </div>
                )}

                {/* Grid for Engine Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* AI Online Engine Card */}
                  <div
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      formData.enableAiEngine
                        ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-950/40'
                        : 'bg-slate-950/60 border-slate-800 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.enableAiEngine ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 text-xs">🧠 هوش مصنوعی آنلاین</span>
                            <p className="text-[10px] text-indigo-300">Gemini Pro/Flash Multimodal</p>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          type="button"
                          id="toggle-ai-engine-btn"
                          onClick={handleToggleAi}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            formData.enableAiEngine ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.enableAiEngine ? 'translate-x-1' : 'translate-x-6'
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        استفاده از هوش مصنوعی برای درک عمیق روند، سطوح عرضه/تقاضا، سنتیمنت بازار و نگارش گزارش تفسیری فارسی.
                      </p>

                      <ul className="mt-2.5 space-y-1 text-[10px] text-slate-400">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-indigo-400" />
                          بررسی زنده پرایس‌اکشن و کندل‌ها
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-indigo-400" />
                          تولید تارگت‌های چندمرحله‌ای TP1 تا TP3
                        </li>
                      </ul>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">وضعیت در سیستم:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${formData.enableAiEngine ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {formData.enableAiEngine ? '🟢 فعال و در دسترس' : '🔴 غیرفعال'}
                      </span>
                    </div>
                  </div>

                  {/* Offline Knowledge SMC Engine Card */}
                  <div
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      formData.enableOfflineEngine
                        ? 'bg-cyan-950/30 border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                        : 'bg-slate-950/60 border-slate-800 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.enableOfflineEngine ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 text-xs">📚 دانش و استراتژی آفلاین</span>
                            <p className="text-[10px] text-cyan-300">SMC & Price Action Engine</p>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          type="button"
                          id="toggle-offline-engine-btn"
                          onClick={handleToggleOffline}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            formData.enableOfflineEngine ? 'bg-cyan-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.enableOfflineEngine ? 'translate-x-1' : 'translate-x-6'
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        محاسبه بلادرنگ ستاپ معاملاتی با فرمول‌های ریاضی قطعی، قوانین اسمارت‌مانی (SMC)، اردربلاک و نقدینگی بدون وابستگی به مدل‌های زبانی هوش مصنوعی.
                      </p>

                      <ul className="mt-2.5 space-y-1 text-[10px] text-slate-400">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-cyan-400" />
                          شناسایی اردربلاک (OB) و گپ‌های ارزش منصفانه (FVG)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-cyan-400" />
                          محاسبه سطوح فیبوناچی ۰.۶۱۸ و ۰.۷۸۶
                        </li>
                      </ul>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">وضعیت در سیستم:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${formData.enableOfflineEngine ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {formData.enableOfflineEngine ? '🟢 فعال و در دسترس' : '🔴 غیرفعال'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Engine Mode Selection */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  موتور پیش‌فرض تولید ستاپ و تحلیل (Default System Engine):
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  هنگامی که کاربر در تلگرام، بله یا پنل، دستوری بدون ذکر مدل تحلیلی ارسال می‌کند، سیستم به صورت پیش‌فرض از این موتور استفاده خواهد کرد:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div
                    onClick={() => {
                      if (formData.enableAiEngine) {
                        setFormData({ ...formData, defaultEngineMode: 'ONLINE_AI' });
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      !formData.enableAiEngine
                        ? 'opacity-40 cursor-not-allowed bg-slate-900/50 border-slate-800'
                        : formData.defaultEngineMode === 'ONLINE_AI'
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-indigo-300">🧠 هوش مصنوعی آنلاین (Online AI)</span>
                      {formData.defaultEngineMode === 'ONLINE_AI' && formData.enableAiEngine && (
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      تحلیل جامع مبتنی بر هوش مصنوعی Gemini و پرایس‌اکشن زنده
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      if (formData.enableOfflineEngine) {
                        setFormData({ ...formData, defaultEngineMode: 'OFFLINE_RULES' });
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      !formData.enableOfflineEngine
                        ? 'opacity-40 cursor-not-allowed bg-slate-900/50 border-slate-800'
                        : formData.defaultEngineMode === 'OFFLINE_RULES'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-cyan-300">📚 دانش و الگوریتم آفلاین (SMC)</span>
                      {formData.defaultEngineMode === 'OFFLINE_RULES' && formData.enableOfflineEngine && (
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      الگوریتم‌های ریاضی قطعی اسمارت‌مانی بدون استفاده از هوش مصنوعی
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1. RISK & PROFIT MANAGEMENT TAB */}
          {activeTab === 'risk' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    انتخاب پروفایل سوددهی و شدت ریسک (Profit & Risk Profile):
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    اعمال فوری در تمام تحلیل‌ها و بات‌ها
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Conservative */}
                  <div
                    onClick={() =>
                      setFormData({
                        ...formData,
                        riskSettings: {
                          ...formData.riskSettings,
                          profile: 'conservative',
                          maxRiskPercent: 1.0,
                          maxLeverage: 5,
                          minRRRatio: 2.0,
                          tpStyle: 'tight_safe',
                        },
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-right ${
                      formData.riskSettings.profile === 'conservative'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-200 shadow-md shadow-blue-950'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-blue-300">🛡️ کم‌ریسک و محافظه‌کار</span>
                      {formData.riskSettings.profile === 'conservative' && (
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      حفظ اصل سرمایه، ورود با تاییدیه عمیق، اهرم کم (3x-5x) و تارگت‌های ایمن با احتمال برد بالا.
                    </p>
                  </div>

                  {/* Moderate */}
                  <div
                    onClick={() =>
                      setFormData({
                        ...formData,
                        riskSettings: {
                          ...formData.riskSettings,
                          profile: 'moderate',
                          maxRiskPercent: 2.0,
                          maxLeverage: 12,
                          minRRRatio: 2.5,
                          tpStyle: 'balanced',
                        },
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-right ${
                      formData.riskSettings.profile === 'moderate'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-emerald-300">⚖️ متعادل و استاندارد</span>
                      {formData.riskSettings.profile === 'moderate' && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      توازن حرفه‌ای سود و ریسک، اهرم 10x-15x، نسبت سود به ضرر بالای 1:2.5 و پرایس‌اکشن کلاسیک SMC.
                    </p>
                  </div>

                  {/* Aggressive */}
                  <div
                    onClick={() =>
                      setFormData({
                        ...formData,
                        riskSettings: {
                          ...formData.riskSettings,
                          profile: 'aggressive',
                          maxRiskPercent: 3.5,
                          maxLeverage: 25,
                          minRRRatio: 3.5,
                          tpStyle: 'extended_runner',
                        },
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-right ${
                      formData.riskSettings.profile === 'aggressive'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-200 shadow-md shadow-purple-950'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-purple-300">🚀 تهاجمی و پربازده</span>
                      {formData.riskSettings.profile === 'aggressive' && (
                        <Check className="w-3.5 h-3.5 text-purple-400" />
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      سوددهی حداکثری و اسکلپ سریع، اهرم بالا (15x-30x)، تارگت‌های گسترده TP3 و امواج انفجاری.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fine-Tuned Numerical Controls */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <h4 className="font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  تنظیم دقیق پارامترهای ورود و خروج:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Max Risk Per Trade */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-medium">
                        حداکثر درصد ریسک مجاز در هر معامله:
                      </label>
                      <span className="text-emerald-400 font-bold mono-num">
                        {formData.riskSettings.maxRiskPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.5"
                      value={formData.riskSettings.maxRiskPercent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          riskSettings: {
                            ...formData.riskSettings,
                            maxRiskPercent: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500 bg-slate-800"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.5% (بسیار محافظه‌کار)</span>
                      <span>2% (استاندارد)</span>
                      <span>5% (ریسک بالا)</span>
                    </div>
                  </div>

                  {/* Max Leverage */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-medium">
                        سقف اهرم پیشنهادی (Max Leverage):
                      </label>
                      <span className="text-purple-400 font-bold mono-num">
                        {formData.riskSettings.maxLeverage}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="50"
                      step="1"
                      value={formData.riskSettings.maxLeverage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          riskSettings: {
                            ...formData.riskSettings,
                            maxLeverage: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-purple-500 bg-slate-800"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>3x (Spot/Safe)</span>
                      <span>15x (Medium)</span>
                      <span>50x (Degen Scalp)</span>
                    </div>
                  </div>

                  {/* Min Risk to Reward */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-medium">
                        حداقل نسبت سود به ضرر مورد انتظار (Min R:R):
                      </label>
                      <span className="text-amber-400 font-bold mono-num">
                        1:{formData.riskSettings.minRRRatio}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="5.0"
                      step="0.5"
                      value={formData.riskSettings.minRRRatio}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          riskSettings: {
                            ...formData.riskSettings,
                            minRRRatio: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-500 bg-slate-800"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>1:1.5</span>
                      <span>1:2.5 (پیشنهادی)</span>
                      <span>1:5.0</span>
                    </div>
                  </div>

                  {/* TP Exit Strategy */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium block">
                      سبک تارگت‌گذاری و خروج سود (TP Strategy):
                    </label>
                    <select
                      value={formData.riskSettings.tpStyle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          riskSettings: {
                            ...formData.riskSettings,
                            tpStyle: e.target.value as any,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="tight_safe">سیو سود سریع در TP1 و ریسک‌فری فوری</option>
                      <option value="balanced">توزیع پله‌ای استاندارد (۵۰٪ - ۳۰٪ - ۲۰٪)</option>
                      <option value="extended_runner">نگهداری مون‌بگ برای امواج بلندمدت TP3</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. AUTO-HUNTER & WATCHLIST TAB */}
          {activeTab === 'auto_hunter' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-200 flex items-center gap-2">
                      <Radar className="w-4 h-4 text-purple-400" />
                      شکارچی خودکار فرصت‌های بازار (Auto-Pilot AI Signal Hunter)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      سیستم در پس‌زمینه واچ‌لیست را رصد کرده و در صورت کشف ستاپ طلایی آن را پیشنهاد می‌دهد
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoHunter.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          autoHunter: {
                            ...formData.autoHunter,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      بازه زمانی بررسی خودکار (Scan Interval):
                    </label>
                    <select
                      value={formData.autoHunter.intervalMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          autoHunter: {
                            ...formData.autoHunter,
                            intervalMinutes: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="1">هر ۱ دقیقه (بسیار سریع)</option>
                      <option value="3">هر ۳ دقیقه (متوسط)</option>
                      <option value="5">هر ۵ دقیقه (استاندارد)</option>
                      <option value="15">هر ۱۵ دقیقه</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      حداقل گرید ستاپ برای پیشنهاد:
                    </label>
                    <select
                      value={formData.autoHunter.minGrade}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          autoHunter: {
                            ...formData.autoHunter,
                            minGrade: e.target.value as SetupGrade,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="A+">فقط ستاپ‌های طلایی A+ (اطمینان بالای ۸۵٪)</option>
                      <option value="A">گرید A و بالاتر (اطمینان بالای ۷۵٪)</option>
                      <option value="B">همه ستاپ‌ها (شامل گرید B)</option>
                    </select>
                  </div>
                </div>

                {/* Auto Broadcast check */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.autoHunter.autoBroadcastToTelegram}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          autoHunter: {
                            ...formData.autoHunter,
                            autoBroadcastToTelegram: e.target.checked,
                          },
                        })
                      }
                      className="accent-sky-500 rounded"
                    />
                    <span>ارسال خودکار ستاپ‌های A+ به تلگرام</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.autoHunter.autoBroadcastToBale}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          autoHunter: {
                            ...formData.autoHunter,
                            autoBroadcastToBale: e.target.checked,
                          },
                        })
                      }
                      className="accent-emerald-500 rounded"
                    />
                    <span>ارسال خودکار ستاپ‌های A+ به بله</span>
                  </label>
                </div>
              </div>

              {/* Watchlist management */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200">
                    واچ‌لیست دارایی‌های تحت نظر شکارچی ({formData.autoHunter.watchlist.length} نماد):
                  </h4>
                  <span className="text-[10px] text-slate-400">شامل کریپتو، طلا، سهام آمریکا و فارکس</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="افزودن نماد جدید (مثلا: XRPUSDT یا TSLA)..."
                    value={newSymbolInput}
                    onChange={(e) => setNewSymbolInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addWatchlistSymbol()}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 mono-num placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={addWatchlistSymbol}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.autoHunter.watchlist.map((sym) => (
                    <div
                      key={sym}
                      className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-slate-200 font-mono text-xs hover:border-slate-700"
                    >
                      <span>#{sym}</span>
                      <button
                        onClick={() => removeWatchlistSymbol(sym)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                        title="حذف از واچ‌لیست"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. TELEGRAM BOT TAB */}
          {activeTab === 'telegram' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-sky-400" />
                  راهنمای ساخت ربات تلگرام در ۳ مرحله:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>در تلگرام به آیدی <b>@BotFather</b> بروید و دستور <code>/newbot</code> را بزنید.</li>
                  <li>یک نام و یک نام‌کاربری تعیین کنید تا <b>HTTP API Token</b> دریافت کنید.</li>
                  <li>ربات خود را در تلگرام استارت کنید یا آن را ادمین کانال/گروه سیگنال خود نمایید.</li>
                  <li>توکن و Chat ID (یا آیدی کانال مثل <code>@my_channel</code> یا آیدی عددی شما) را در فیلدهای زیر وارد کنید.</li>
                </ol>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    توکن ربات تلگرام (Telegram Bot Token):
                  </label>
                  <input
                    type="password"
                    placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz..."
                    value={formData.telegramToken}
                    onChange={(e) => setFormData({ ...formData, telegramToken: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 mono-num focus:border-sky-500 focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    آیدی چت یا کانال (Chat ID / Channel @username):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: @my_signals_channel یا 12345678"
                    value={formData.telegramChatId}
                    onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 mono-num focus:border-sky-500 focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>آدرس وب‌هوک خودکار سرور (Webhook URL):</span>
                    <button
                      onClick={() => copyUrl(telegramWebhookUrl)}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedWebhook ? 'کپی شد' : 'کپی آدرس'}
                    </button>
                  </div>
                  <div className="mono-num text-[11px] text-slate-300 truncate bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                    {telegramWebhookUrl}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. BALE BOT TAB */}
          {activeTab === 'bale' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  راهنمای ساخت بازوی پیام‌رسان بله (Bale Bot):
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>در پیام‌رسان بله به بازوی <b>BotFather (بات فادر بله)</b> پیام دهید و ربات بسازید.</li>
                  <li>توکن اختصاصی بازو را کپی کنید.</li>
                  <li>بازوی خود را در یک کانال یا گروه بله ادد کنید یا با آن در صفحه شخصی چت کنید.</li>
                  <li>توکن و Chat ID (آیدی عددی چت یا کانال) را در فیلدهای زیر وارد نمایید.</li>
                </ol>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    توکن ربات بله (Bale Bot Token):
                  </label>
                  <input
                    type="password"
                    placeholder="مثال: 987654321:abcdefg..."
                    value={formData.baleToken}
                    onChange={(e) => setFormData({ ...formData, baleToken: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 mono-num focus:border-emerald-500 focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    آیدی چت یا کانال بله (Bale Chat ID):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 12345678 یا @my_bale_channel"
                    value={formData.baleChatId}
                    onChange={(e) => setFormData({ ...formData, baleChatId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 mono-num focus:border-emerald-500 focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>آدرس وب‌هوک بله (Bale Webhook URL):</span>
                    <button
                      onClick={() => copyUrl(baleWebhookUrl)}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedWebhook ? 'کپی شد' : 'کپی آدرس'}
                    </button>
                  </div>
                  <div className="mono-num text-[11px] text-slate-300 truncate bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                    {baleWebhookUrl}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Connection Output */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          {(activeTab === 'telegram' || activeTab === 'bale') ? (
            <button
              id="test-bot-connection-btn"
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isTesting ? 'در حال ارسال پیام تست...' : 'ارسال پیام تست به ربات'}
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              تنظیمات روی تمام بخش‌های پنل و بات‌ها اعمال می‌شود.
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              انصراف
            </button>
            <button
              id="save-bot-config-btn"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 active:scale-95"
            >
              ذخیره تنظیمات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

