import React, { useState, useEffect, useCallback } from 'react';
import {
  TradeSetup,
  MarketTicker,
  MarketCategory,
  Timeframe,
  TradeTimeHorizon,
  BotConfig,
  BotMessage,
} from './types';
import { TradingViewWidget } from './components/TradingViewWidget';
import { MarketTickerBar } from './components/MarketTickerBar';
import { SignalCard } from './components/SignalCard';
import { BotSimulator } from './components/BotSimulator';
import { ScannerView } from './components/ScannerView';
import { SignalHistoryView } from './components/SignalHistoryView';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { BotConfigModal } from './components/BotConfigModal';
import { LegalDisclaimerModal } from './components/LegalDisclaimerModal';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Bot,
  Layers,
  Calculator,
  Smartphone,
  RefreshCw,
  Search,
  Zap,
  Sliders,
  Send,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  Scale,
  Clock,
  Timer,
  Hourglass,
} from 'lucide-react';

const DEFAULT_TICKERS: MarketTicker[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'crypto', price: 96450, change24h: 2.85, high24h: 97800, low24h: 94900, volume24h: '1,420M $', tvSymbol: 'BINANCE:BTCUSDT' },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'crypto', price: 2750, change24h: 1.95, high24h: 2810, low24h: 2690, volume24h: '850M $', tvSymbol: 'BINANCE:ETHUSDT' },
  { symbol: 'SOLUSDT', name: 'Solana', category: 'crypto', price: 195.4, change24h: 4.6, high24h: 201.2, low24h: 188.0, volume24h: '410M $', tvSymbol: 'BINANCE:SOLUSDT' },
  { symbol: 'XRPUSDT', name: 'Ripple', category: 'crypto', price: 2.45, change24h: -1.2, high24h: 2.58, low24h: 2.38, volume24h: '320M $', tvSymbol: 'BINANCE:XRPUSDT' },
  { symbol: 'SUIUSDT', name: 'Sui', category: 'crypto', price: 3.42, change24h: 6.8, high24h: 3.55, low24h: 3.18, volume24h: '190M $', tvSymbol: 'BINANCE:SUIUSDT' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'crypto', price: 0.265, change24h: 3.2, high24h: 0.28, low24h: 0.252, volume24h: '180M $', tvSymbol: 'BINANCE:DOGEUSDT' },
  { symbol: 'XAUUSD', name: 'Gold / طلا', category: 'commodities', price: 2910, change24h: 0.75, high24h: 2925, low24h: 2895, volume24h: '650M $', tvSymbol: 'OANDA:XAUUSD' },
  { symbol: 'EURUSD', name: 'Euro / USD', category: 'forex', price: 1.045, change24h: -0.15, high24h: 1.049, low24h: 1.042, volume24h: '980M $', tvSymbol: 'FX:EURUSD' },
  { symbol: 'NVDA', name: 'Nvidia Corp', category: 'stocks', price: 138.5, change24h: 2.1, high24h: 141.0, low24h: 136.2, volume24h: '1,100M $', tvSymbol: 'NASDAQ:NVDA' },
  { symbol: 'TSLA', name: 'Tesla Inc', category: 'stocks', price: 345.2, change24h: -0.85, high24h: 352.0, low24h: 340.5, volume24h: '820M $', tvSymbol: 'NASDAQ:TSLA' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'chart' | 'bot' | 'scanner' | 'history'>('chart');
  const [activeSymbol, setActiveSymbol] = useState<string>('BTCUSDT');
  const [customSymbolInput, setCustomSymbolInput] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [timeHorizon, setTimeHorizon] = useState<TradeTimeHorizon>('intraday_hours');
  const [engineMode, setEngineMode] = useState<'ONLINE_AI' | 'OFFLINE_RULES'>('ONLINE_AI');
  const [strategy, setStrategy] = useState<string>('SMC & Price Action (Smart Money Concepts)');
  const [directionPreference, setDirectionPreference] = useState<'AUTO' | 'LONG' | 'SHORT'>('AUTO');
  const [userStrategyNotes, setUserStrategyNotes] = useState<string>('');

  const [tickers, setTickers] = useState<MarketTicker[]>(DEFAULT_TICKERS);
  const [activeSetup, setActiveSetup] = useState<TradeSetup | null>(null);
  const [scannerSetups, setScannerSetups] = useState<TradeSetup[]>([]);
  const [signalHistory, setSignalHistory] = useState<TradeSetup[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Bot Simulator State
  const [botPlatform, setBotPlatform] = useState<'telegram' | 'bale'>('telegram');
  const [botMessages, setBotMessages] = useState<BotMessage[]>([
    {
      id: 'msg_welcome',
      platform: 'telegram',
      sender: 'bot',
      text: `👋 **سلام! به ربات تخصصی تحلیل تریدینگ‌ویو و فیوچرز خوش آمدید.**

من چارت، اوردربلاک‌ها، نقدینگی، اندیکاتورها (RSI, MACD, EMAs) و پرایس‌اکشن تریدینگ‌ویو را بررسی می‌کنم و دقیق‌ترین نقطه ورود، ۳ تارگت حد سود، حد ضرر و لوریج مناسب را به شما می‌دهم.

🔹 برای شروع یکی از کلیدهای زیر را انتخاب کنید یا نام نماد مورد نظر را بفرستید:`,
      timestamp: Date.now(),
      buttons: [
        { text: '📊 تحلیل بیت‌کوین (BTC 15m)', callback_data: '/analyze BTCUSDT 15m' },
        { text: '⚡ ستاپ اتریوم (ETH 15m)', callback_data: '/analyze ETHUSDT 15m' },
        { text: '🚀 ستاپ سولانا (SOL 15m)', callback_data: '/analyze SOLUSDT 15m' },
        { text: '🎯 اسکنر فرصت‌های سودآور', callback_data: '/scanner' },
      ],
    },
  ]);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  // Modals & Toast
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isLegalOpen, setIsLegalOpen] = useState<boolean>(false);
  const [calcTargetSetup, setCalcTargetSetup] = useState<TradeSetup | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bot Config State (Persistent via localStorage)
  const [botConfig, setBotConfig] = useState<BotConfig>(() => {
    try {
      const saved = localStorage.getItem('tv_bot_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          riskSettings: parsed.riskSettings || {
            profile: 'moderate',
            maxRiskPercent: 2.0,
            maxLeverage: 15,
            minRRRatio: 2.5,
            tpStyle: 'balanced',
          },
          autoHunter: parsed.autoHunter || {
            enabled: false,
            intervalMinutes: 3,
            watchlist: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XAUUSD', 'NVDA', 'TSLA', 'DOGEUSDT', 'EURUSD'],
            minGrade: 'A',
            autoBroadcastToTelegram: false,
            autoBroadcastToBale: false,
          },
        };
      }
    } catch {}
    return {
      telegramToken: '',
      telegramChatId: '',
      telegramEnabled: true,
      baleToken: '',
      baleChatId: '',
      baleEnabled: true,
      autoBroadcast: false,
      defaultTimeframe: '15m',
      defaultRiskPercent: 2,
      riskSettings: {
        profile: 'moderate',
        maxRiskPercent: 2.0,
        maxLeverage: 15,
        minRRRatio: 2.5,
        tpStyle: 'balanced',
      },
      autoHunter: {
        enabled: false,
        intervalMinutes: 3,
        watchlist: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XAUUSD', 'NVDA', 'TSLA', 'DOGEUSDT', 'EURUSD'],
        minGrade: 'A',
        autoBroadcastToTelegram: false,
        autoBroadcastToBale: false,
      },
    };
  });

  // Load Initial Tickers & Bot Config from backend
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch('/api/market/tickers');
        if (res.ok) {
          const data = await res.json();
          if (data.tickers && data.tickers.length > 0) {
            setTickers(data.tickers);
          }
        }
      } catch (err) {
        console.log('Using default tickers fallback');
      }
    };
    
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/bot/config');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            setBotConfig(data.config);
          }
        }
      } catch (err) {
        console.error('Error fetching backend bot config:', err);
      }
    };

    fetchTickers();
    fetchConfig();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Perform Analysis on Selected Symbol with current Risk Settings & Engine Mode
  const handleAnalyzeChart = useCallback(async (overrideMode?: 'ONLINE_AI' | 'OFFLINE_RULES') => {
    setIsAnalyzing(true);
    const selectedMode = overrideMode || engineMode;
    if (overrideMode) {
      setEngineMode(overrideMode);
    }
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: activeSymbol,
          timeframe,
          timeHorizon,
          strategy,
          actionPreference: directionPreference,
          userNotes: userStrategyNotes,
          riskSettings: botConfig.riskSettings,
          engineMode: selectedMode,
        }),
      });

      const data = await res.json();
      if (data.success && data.setup) {
        setActiveSetup(data.setup);
        // Add to history automatically
        setSignalHistory((prev) => [data.setup, ...prev.slice(0, 19)]);
        const modeLabel = data.setup.engineMode === 'OFFLINE_RULES' ? 'دانش آفلاین' : 'هوش مصنوعی';
        showToast('success', `ستاپ ${data.setup.action} (${modeLabel}) برای ${data.setup.symbol} با موفقیت تولید شد!`);
      } else {
        showToast('error', data.error || 'خطا در تحلیل چارت');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'خطا در اتصال به سرور هوش مصنوعی');
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeSymbol, timeframe, timeHorizon, strategy, directionPreference, userStrategyNotes, botConfig.riskSettings, engineMode]);

  // Initial auto-analysis on first load
  useEffect(() => {
    if (!activeSetup) {
      handleAnalyzeChart();
    }
  }, []);

  // Perform Market Scan with Risk Settings
  const handleRefreshScan = useCallback(async (categories?: MarketCategory[]) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          timeframe,
          riskSettings: botConfig.riskSettings,
        }),
      });
      const data = await res.json();
      if (data.success && data.setups) {
        setScannerSetups(data.setups);
        showToast('success', `${data.setups.length} ستاپ با پتانسیل سود بالا شناسایی شد!`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'خطا در اسکن بازار');
    } finally {
      setIsScanning(false);
    }
  }, [timeframe, botConfig.riskSettings]);

  // Auto-Hunter Trigger
  const handleRunAutoHunter = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/auto-hunter/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlist: botConfig.autoHunter.watchlist,
          timeframe: botConfig.defaultTimeframe || '15m',
          riskSettings: botConfig.riskSettings,
          telegramToken: botConfig.telegramToken,
          telegramChatId: botConfig.telegramChatId,
          baleToken: botConfig.baleToken,
          baleChatId: botConfig.baleChatId,
          autoBroadcastToTelegram: botConfig.autoHunter.autoBroadcastToTelegram,
          autoBroadcastToBale: botConfig.autoHunter.autoBroadcastToBale,
        }),
      });
      const data = await res.json();
      if (data.success && data.setups) {
        setScannerSetups(data.setups);
        if (data.setups.length > 0) {
          setActiveSetup(data.setups[0]);
          setActiveSymbol(data.setups[0].symbol);
        }
        showToast('success', `شکارچی خودکار ${data.setups.length} ستاپ طلایی از واچ‌لیست کشف کرد!`);
      }
    } catch (err: any) {
      showToast('error', 'خطا در اجرای شکارچی خودکار');
    } finally {
      setIsScanning(false);
    }
  };

  // Background Auto-Hunter interval when enabled
  useEffect(() => {
    if (!botConfig.autoHunter.enabled) return;
    const intervalMs = (botConfig.autoHunter.intervalMinutes || 3) * 60 * 1000;
    const timer = setInterval(() => {
      handleRunAutoHunter();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [botConfig.autoHunter.enabled, botConfig.autoHunter.intervalMinutes, botConfig.riskSettings]);

  // Send Trade Setup to Real Telegram Channel/Bot
  const handleSendToTelegram = async (setup: TradeSetup) => {
    try {
      const res = await fetch('/api/bot/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'telegram',
          telegramToken: botConfig.telegramToken,
          telegramChatId: botConfig.telegramChatId,
          telegramMessage: setup.telegramMessage,
        }),
      });
      const data = await res.json();
      if (data.success && data.results?.[0]?.success) {
        showToast('success', `سیگنال ${setup.symbol} با موفقیت به ربات تلگرام ارسال شد!`);
      } else {
        // Add to bot simulator chat and show notice
        setBotMessages((prev) => [
          ...prev,
          {
            id: `msg_tg_${Date.now()}`,
            platform: 'telegram',
            sender: 'bot',
            text: setup.telegramMessage,
            timestamp: Date.now(),
            setup,
          },
        ]);
        showToast('success', 'سیگنال به شبیه‌ساز تلگرام ارسال شد (برای ارسال به تلگرام واقعی، توکن را در تنظیمات وارد کنید).');
      }
    } catch (err: any) {
      showToast('error', 'خطا در ارسال پیام تلگرام');
    }
  };

  // Send Trade Setup to Real Bale Channel/Bot
  const handleSendToBale = async (setup: TradeSetup) => {
    try {
      const res = await fetch('/api/bot/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'bale',
          baleToken: botConfig.baleToken,
          baleChatId: botConfig.baleChatId,
          baleMessage: setup.baleMessage,
        }),
      });
      const data = await res.json();
      if (data.success && data.results?.[0]?.success) {
        showToast('success', `سیگنال ${setup.symbol} با موفقیت به پیام‌رسان بله ارسال شد!`);
      } else {
        setBotMessages((prev) => [
          ...prev,
          {
            id: `msg_bale_${Date.now()}`,
            platform: 'bale',
            sender: 'bot',
            text: setup.baleMessage,
            timestamp: Date.now(),
            setup,
          },
        ]);
        showToast('success', 'سیگنال به شبیه‌ساز بله ارسال شد (برای ارسال به کانال بله، توکن را تنظیم کنید).');
      }
    } catch (err: any) {
      showToast('error', 'خطا در ارسال به بله');
    }
  };

  // Bot Simulator Message Handler
  const handleBotUserMessage = async (userText: string, platform: 'telegram' | 'bale') => {
    const userMsg: BotMessage = {
      id: `user_${Date.now()}`,
      platform,
      sender: 'user',
      text: userText,
      timestamp: Date.now(),
    };
    setBotMessages((prev) => [...prev, userMsg]);
    setIsBotThinking(true);

    try {
      const clean = userText.trim().toLowerCase();
      if (clean === '/start' || clean === 'شروع' || clean === 'سلام') {
        const replyText = `👋 **درود بر شما معامله‌گر گرامی!**

ربات سیگنال‌دهی تریدینگ‌ویو آماده تحلیل است.
برای دریافت نقطه ورود و خروج:
▫️ نام نماد را بفرستید، مثلا: \`BTCUSDT\` یا \`/analyze ETHUSDT 15m\`
▫️ یا روی گزینه‌های زیر کلیک کنید:`;
        setBotMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            platform,
            sender: 'bot',
            text: replyText,
            timestamp: Date.now(),
            buttons: [
              { text: '📊 تحلیل زنده BTC', callback_data: '/analyze BTCUSDT 15m' },
              { text: '⚡ ستاپ فیوچرز SOL', callback_data: '/analyze SOLUSDT 15m' },
              { text: '🎯 اسکنر بازار', callback_data: '/scanner' },
            ],
          },
        ]);
      } else if (clean === '/scanner' || clean.includes('اسکنر') || clean.includes('فرصت')) {
        const scanRes = await fetch('/api/scanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeframe: '15m' }),
        });
        const scanData = await scanRes.json();
        const topSetups = scanData.setups?.slice(0, 3) || [];
        let summaryText = `🎯 **اسکنر تریدینگ‌ویو: ۳ ستاپ طلایی شناسایی شده**\n\n`;
        topSetups.forEach((s: TradeSetup, idx: number) => {
          summaryText += `🔹 **${idx + 1}. #${s.symbol}** (${s.action === 'LONG' ? '🟢 لانگ' : '🔴 شورت'})\n▫️ ورود: $${s.optimalEntry} | تارگت ۱: $${s.takeProfits[0]?.price} | استاپ: $${s.stopLoss.price} | RR: 1:${s.riskRewardRatio}\n\n`;
        });
        summaryText += `💡 برای دریافت جزییات کامل هر نماد، دستور \`/analyze <نماد>\` را بفرستید.`;

        setBotMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            platform,
            sender: 'bot',
            text: summaryText,
            timestamp: Date.now(),
          },
        ]);
      } else {
        // Extract symbol
        const parts = userText.replace('/analyze', '').replace('/futures', '').trim().split(' ');
        const sym = (parts[0] || 'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const tf = parts[1] || '15m';

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: sym, timeframe: tf }),
        });
        const data = await res.json();
        if (data.success && data.setup) {
          const formattedMsg = platform === 'telegram' ? data.setup.telegramMessage : data.setup.baleMessage;
          setBotMessages((prev) => [
            ...prev,
            {
              id: `bot_${Date.now()}`,
              platform,
              sender: 'bot',
              text: formattedMsg,
              timestamp: Date.now(),
              setup: data.setup,
              buttons: [
                { text: `📊 مشاهده ${sym} در چارت`, callback_data: `/analyze ${sym} 15m` },
                { text: '🧮 محاسبه حجم معامله', callback_data: `/calc ${sym}` },
              ],
            },
          ]);
        }
      }
    } catch (err) {
      setBotMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          platform,
          sender: 'bot',
          text: '⚠️ متاسفانه در پردازش چارت خطایی رخ داد. لطفاً نماد معتبری مانند BTCUSDT یا ETHUSDT ارسال کنید.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsBotThinking(false);
    }
  };

  const handleCustomSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSymbolInput.trim()) return;
    const s = customSymbolInput.trim().toUpperCase();
    setActiveSymbol(s);
    setCustomSymbolInput('');
  };

  const handleSaveConfig = async (newConfig: BotConfig) => {
    setBotConfig(newConfig);
    try {
      localStorage.setItem('tv_bot_config', JSON.stringify(newConfig));
      // Save globally to backend persistent store
      await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch (err) {
      console.error('Failed to sync config with backend:', err);
    }
    showToast('success', 'تنظیمات ربات ذخیره و روی سرور اعمال شد.');
  };

  const handleTestConnection = async (platform: 'telegram' | 'bale', token: string, chatId: string) => {
    const res = await fetch('/api/bot/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, token, chatId }),
    });
    return await res.json();
  };

  const handleUpdateJournalStatus = (id: string, newStatus: TradeSetup['status']) => {
    setSignalHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    showToast('success', 'وضعیت سیگنال در ژورنال به‌روزرسانی شد.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 border backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500 text-rose-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Main Navigation Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800/90 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-500 p-0.5 shadow-lg shadow-emerald-950">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-sm md:text-base text-slate-100 tracking-tight">
                    TradingView Signal AI Bot
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    تلگرام & بله
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  تحلیل تکنیکال هوشمند، نقطه ورود و خروج فیوچرز (Long/Short) با بالاترین سود
                </p>
              </div>
            </div>

            {/* Quick Bot Config Trigger on Mobile */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                id="mobile-legal-btn"
                onClick={() => setIsLegalOpen(true)}
                className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700"
                title="قوانین و سلب مسئولیت"
              >
                <Scale className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700"
                title="اتصال بات"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsCalcOpen(true)}
                className="p-2 rounded-xl bg-slate-800 text-purple-400 border border-slate-700"
                title="ماشین حساب"
              >
                <Calculator className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary View Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full md:w-auto overflow-x-auto scrollbar-none justify-center">
            <button
              id="tab-chart"
              onClick={() => setActiveTab('chart')}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'chart'
                  ? 'bg-slate-800 text-emerald-400 shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              چارت و ستاپ تحلیلی
            </button>

            <button
              id="tab-bot"
              onClick={() => setActiveTab('bot')}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'bot'
                  ? 'bg-slate-800 text-sky-400 shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              ربات تلگرام و بله
            </button>

            <button
              id="tab-scanner"
              onClick={() => {
                setActiveTab('scanner');
                if (scannerSetups.length === 0) handleRefreshScan();
              }}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'scanner'
                  ? 'bg-slate-800 text-amber-400 shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              اسکنر هوشمند
            </button>

            <button
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-purple-400 shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              ژورنال معاملات ({signalHistory.length})
            </button>
          </div>

          {/* Action Tools */}
          <div className="hidden md:flex items-center gap-2">
            <button
              id="open-legal-rules-header"
              onClick={() => setIsLegalOpen(true)}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
              title="قوانین، شرایط استفاده و سلب مسئولیت حقوقی"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>قوانین و مسئولیت</span>
            </button>

            <button
              id="open-calculator-header"
              onClick={() => {
                setCalcTargetSetup(activeSetup);
                setIsCalcOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>محاسبه‌گر حجم و سود</span>
            </button>

            <button
              id="open-bot-config-header"
              onClick={() => setIsConfigOpen(true)}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>اتصال ربات تلگرام / بله</span>
            </button>
          </div>
        </div>
      </header>

      {/* Live Market Tickers Bar */}
      <MarketTickerBar
        tickers={tickers}
        activeSymbol={activeSymbol}
        onSelectSymbol={(sym) => {
          setActiveSymbol(sym);
          if (activeTab !== 'chart') setActiveTab('chart');
        }}
        selectedCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* VIEW 1: TradingView Chart & AI Trade Setup */}
        {activeTab === 'chart' && (
          <div className="space-y-6">
            {/* Risk Management & Auto-Hunter Quick Bar */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 md:p-4 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Profit & Risk Selector */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold ml-1">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>حالت سوددهی و ریسک:</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => {
                      const updatedConfig: BotConfig = {
                        ...botConfig,
                        riskSettings: {
                          ...botConfig.riskSettings,
                          profile: 'conservative',
                          maxRiskPercent: 1.0,
                          maxLeverage: 5,
                          minRRRatio: 2.0,
                          tpStyle: 'tight_safe',
                        },
                      };
                      handleSaveConfig(updatedConfig);
                      showToast('success', 'حالت سوددهی به کم‌ریسک و محافظه‌کار تغییر یافت.');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      botConfig.riskSettings.profile === 'conservative'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🛡️ کم‌ریسک (1%)</span>
                  </button>

                  <button
                    onClick={() => {
                      const updatedConfig: BotConfig = {
                        ...botConfig,
                        riskSettings: {
                          ...botConfig.riskSettings,
                          profile: 'moderate',
                          maxRiskPercent: 2.0,
                          maxLeverage: 15,
                          minRRRatio: 2.5,
                          tpStyle: 'balanced',
                        },
                      };
                      handleSaveConfig(updatedConfig);
                      showToast('success', 'حالت سوددهی به متعادل و استاندارد تغییر یافت.');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      botConfig.riskSettings.profile === 'moderate'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>⚖️ متعادل (2%)</span>
                  </button>

                  <button
                    onClick={() => {
                      const updatedConfig: BotConfig = {
                        ...botConfig,
                        riskSettings: {
                          ...botConfig.riskSettings,
                          profile: 'aggressive',
                          maxRiskPercent: 3.5,
                          maxLeverage: 25,
                          minRRRatio: 3.5,
                          tpStyle: 'extended_runner',
                        },
                      };
                      handleSaveConfig(updatedConfig);
                      showToast('success', 'حالت سوددهی به تهاجمی و پربازده تغییر یافت.');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      botConfig.riskSettings.profile === 'aggressive'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🚀 تهاجمی (3.5%)</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 hidden lg:inline">
                  (اهرم تا {botConfig.riskSettings.maxLeverage}x • حداقل RR: 1:{botConfig.riskSettings.minRRRatio})
                </span>
              </div>

              {/* Auto Hunter Quick Action */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <button
                  id="auto-hunter-quick-scan-btn"
                  onClick={handleRunAutoHunter}
                  disabled={isScanning}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="اسکن و شکار سریع ستاپ‌ها از روی واچ‌لیست"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : 'text-purple-400'}`} />
                  <span>{isScanning ? 'در حال شکار فرصت‌ها...' : '⚡ شکار خودکار واچ‌لیست'}</span>
                </button>

                <button
                  onClick={() => setIsConfigOpen(true)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                  title="تنظیمات پیشرفته ریسک و ربات"
                >
                  <Sliders className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* Control Bar: Symbol selector, Timeframe, Strategy & AI Generate Button */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Symbol Search & Timeframe & Engine Mode */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                {/* Engine Mode Selector (Online AI vs Offline Knowledge) */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setEngineMode('ONLINE_AI')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      engineMode === 'ONLINE_AI'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="تحلیل بلادرنگ هوش مصنوعی Gemini با بررسی همزمان اندیکاتورها و پرایس‌اکشن"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>🧠 هوش مصنوعی آنلاین</span>
                  </button>

                  <button
                    onClick={() => setEngineMode('OFFLINE_RULES')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      engineMode === 'OFFLINE_RULES'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="تحلیل بدون نیاز به API و بر اساس دانشنامه و قوانین پرایس‌اکشن، نقدینگی و SMC"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>📚 دانش و استراتژی آفلاین</span>
                  </button>
                </div>

                {/* Custom Symbol Input */}
                <form onSubmit={handleCustomSymbolSubmit} className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="جستجوی نماد (مثلا BTC, ETH, XAU)..."
                    value={customSymbolInput}
                    onChange={(e) => setCustomSymbolInput(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44 font-['Plus_Jakarta_Sans',sans-serif]"
                  />
                </form>

                {/* Timeframe Selector */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  {(['1m', '5m', '15m', '1h', '4h', '1D'] as Timeframe[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        timeframe === tf
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Direction Preference */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setDirectionPreference('AUTO')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      directionPreference === 'AUTO' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400'
                    }`}
                  >
                    خودکار
                  </button>
                  <button
                    onClick={() => setDirectionPreference('LONG')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      directionPreference === 'LONG' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    لانگ (Long)
                  </button>
                  <button
                    onClick={() => setDirectionPreference('SHORT')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      directionPreference === 'SHORT' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    شورت (Short)
                  </button>
                </div>

                {/* Time Horizon Selector (Minutes, Hours, Days, Weeks) */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-indigo-900/50 text-xs shadow-inner">
                  <div className="flex items-center gap-1 px-1.5 text-indigo-400 font-semibold text-[11px] hidden sm:flex">
                    <Clock className="w-3.5 h-3.5" />
                    <span>افق زمانی:</span>
                  </div>
                  <button
                    onClick={() => setTimeHorizon('scalp_minutes')}
                    className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      timeHorizon === 'scalp_minutes'
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="اسکلپ سریع فیوچرز: تارگت‌های ۵ تا ۳۰ دقیقه‌ای"
                  >
                    <span>⚡ اسکلپ (دقیقه‌ای)</span>
                  </button>

                  <button
                    onClick={() => setTimeHorizon('intraday_hours')}
                    className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      timeHorizon === 'intraday_hours'
                        ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="معاملات درون‌روز: تارگت‌های ۱ تا ۴ ساعته"
                  >
                    <span>⏱️ درون‌روز (ساعتی)</span>
                  </button>

                  <button
                    onClick={() => setTimeHorizon('swing_days')}
                    className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      timeHorizon === 'swing_days'
                        ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="معاملات سوینگ: تارگت‌های ۱ تا ۳ روزه"
                  >
                    <span>📅 سوینگ (روزانه)</span>
                  </button>
                </div>
              </div>

              {/* Strategy Selector & Generate Button */}
              <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="SMC & Price Action (Smart Money Concepts)">استراتژی پرایس‌اکشن و SMC (نقدینگی و اوردربلاک)</option>
                  <option value="Scalping & Quick Momentum">اسکلپ سریع فیوچرز (RSI واگرایی + EMA Crossover)</option>
                  <option value="Swing Support & Resistance">معاملات سوینگ و شکست سطوح کلیدی (Breakout/Retest)</option>
                  <option value="Fibonacci & Trend Expansion">فیبوناچی اکستنشن و پرایس اکشن تریدینگ‌ویو</option>
                </select>

                <button
                  id="generate-analysis-btn"
                  onClick={() => handleAnalyzeChart()}
                  disabled={isAnalyzing}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg active:scale-95 whitespace-nowrap disabled:opacity-50 ${
                    engineMode === 'OFFLINE_RULES'
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-cyan-950'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  {isAnalyzing
                    ? 'در حال تحلیل چارت و محاسبه نقاط...'
                    : engineMode === 'OFFLINE_RULES'
                    ? 'تولید ستاپ با دانش آفلاین SMC'
                    : 'بررسی چارت با هوش مصنوعی'}
                </button>
              </div>
            </div>

            {/* TradingView Chart Container */}
            <div className="h-[520px] w-full">
              <TradingViewWidget symbol={activeSymbol} timeframe={timeframe} />
            </div>

            {/* Generated Signal Card */}
            {activeSetup ? (
              <SignalCard
                setup={activeSetup}
                onSendToTelegram={handleSendToTelegram}
                onSendToBale={handleSendToBale}
                onOpenCalculator={(s) => {
                  setCalcTargetSetup(s);
                  setIsCalcOpen(true);
                }}
                onSaveToJournal={(s) => {
                  setSignalHistory((prev) => [s, ...prev]);
                  showToast('success', 'سیگنال در ژورنال ذخیره شد.');
                }}
                onOpenLegal={() => setIsLegalOpen(true)}
                onReAnalyzeWithMode={(mode) => handleAnalyzeChart(mode)}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-slate-200">در حال دریافت و تحلیل دیتای تریدینگ‌ویو...</h4>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Dual Telegram & Bale Bot Simulator */}
        {activeTab === 'bot' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  شبیه‌ساز و وب‌هوک زنده ربات تلگرام و بله (TradingView Bot Hub)
                </h3>
                <p className="text-xs text-slate-400">
                  در این محیط می‌توانید مستقیماً با ربات چت کنید، دستورات فیوچرز بفرستید یا ربات واقعی خود را با توکن متصل کنید.
                </p>
              </div>

              <button
                onClick={() => setIsConfigOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                تنظیمات وب‌هوک و توکن
              </button>
            </div>

            <BotSimulator
              platform={botPlatform}
              onPlatformChange={setBotPlatform}
              messages={botMessages}
              onSendMessage={handleBotUserMessage}
              isLoading={isBotThinking}
              onOpenConfig={() => setIsConfigOpen(true)}
              onOpenLegal={() => setIsLegalOpen(true)}
            />
          </div>
        )}

        {/* VIEW 3: Multi-Asset Scanner */}
        {activeTab === 'scanner' && (
          <ScannerView
            setups={scannerSetups}
            onSelectSetup={(s) => {
              setActiveSymbol(s.symbol);
              setActiveSetup(s);
              setActiveTab('chart');
            }}
            onRefreshScan={handleRefreshScan}
            isLoading={isScanning}
            onSendToTelegram={handleSendToTelegram}
            onSendToBale={handleSendToBale}
          />
        )}

        {/* VIEW 4: Signal Journal & History */}
        {activeTab === 'history' && (
          <SignalHistoryView
            history={signalHistory}
            onUpdateStatus={handleUpdateJournalStatus}
            onClearHistory={() => {
              setSignalHistory([]);
              showToast('success', 'تاریخچه سیگنال‌ها پاک شد.');
            }}
            onSendToTelegram={handleSendToTelegram}
            onSendToBale={handleSendToBale}
          />
        )}
      </main>

      {/* Modals */}
      <RiskCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        setup={calcTargetSetup}
      />

      <BotConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={botConfig}
        onSaveConfig={handleSaveConfig}
        onTestConnection={handleTestConnection}
      />

      <LegalDisclaimerModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        onAccept={() => showToast('success', 'قوانین، سلب مسئولیت و اصول مدیریت ریسک تایید شد.')}
      />
    </div>
  );
}
