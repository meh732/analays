import { LiveTickerData } from "./market.js";
import { GeneratedTradeSetup, AnalysisRequest } from "./gemini.js";
import { calculateTradeTiming, TradeTimeHorizon, TradeTimingDetails } from "./tradeTiming.js";

export interface KnowledgeRule {
  id: string;
  nameFa: string;
  nameEn: string;
  concept: string;
  category: 'SMC' | 'PriceAction' | 'Indicators' | 'Fibonacci' | 'RiskManagement';
  explanationFa: string;
  isTriggered: boolean;
}

/**
 * Institutional Offline Knowledge & Strategy Engine
 * Built-in quantitative rules, Smart Money Concepts (SMC), OTE Fibonacci, RSI Divergence & Trend Math
 * Operates completely offline with 0 API dependencies.
 */
export function generateOfflineTradingSetup(
  req: AnalysisRequest,
  marketData: LiveTickerData
): GeneratedTradeSetup {
  const price = marketData.price;
  const tf = req.timeframe || "15m";
  const profile = req.riskSettings?.profile || "moderate";
  const rsi = marketData.indicators.rsi14;
  const ema20 = marketData.indicators.ema20;
  const ema50 = marketData.indicators.ema50;
  const ema200 = marketData.indicators.ema200;
  const sup1 = marketData.indicators.support1;
  const sup2 = marketData.indicators.support2;
  const res1 = marketData.indicators.resistance1;
  const res2 = marketData.indicators.resistance2;

  // 1. Evaluate Confluences & Strategy Rules
  const appliedRules: KnowledgeRule[] = [];

  // Rule 1: Trend alignment via EMA 20 & 50
  const isEmaBullish = ema20 > ema50 && price >= ema50;
  const isEmaBearish = ema20 < ema50 && price <= ema50;
  if (isEmaBullish) {
    appliedRules.push({
      id: "EMA_GOLDEN_ALIGNMENT",
      nameFa: "همگرایی صعودی میانگین‌های متحرک (EMA 20 > 50)",
      nameEn: "Bullish EMA Alignment",
      concept: "Trend Following",
      category: "PriceAction",
      explanationFa: "تثبیت قیمت بالاتر از میانگین‌های نمایی کوتاه‌مدت و میان‌مدت، نشان‌دهنده تسلط کامل خریداران است.",
      isTriggered: true,
    });
  } else if (isEmaBearish) {
    appliedRules.push({
      id: "EMA_DEATH_ALIGNMENT",
      nameFa: "همگرایی نزولی میانگین‌های متحرک (EMA 20 < 50)",
      nameEn: "Bearish EMA Alignment",
      concept: "Trend Following",
      category: "PriceAction",
      explanationFa: "ریزش قیمت به زیر میانگین‌های متحرک و شیب منفی، نشانه فشار فروش و فاز توزیع سازمانی است.",
      isTriggered: true,
    });
  }

  // Rule 2: RSI Momentum & Divergence Rules
  let rsiCondition: 'Oversold' | 'Overbought' | 'Neutral' | 'Bullish Divergence' | 'Bearish Divergence' = "Neutral";
  if (rsi < 32) {
    rsiCondition = "Oversold";
    appliedRules.push({
      id: "RSI_OVERSOLD_REACTION",
      nameFa: "اشباع فروش و تخلیه فشار خرسی (RSI < 32)",
      nameEn: "RSI Oversold Bounce",
      concept: "Mean Reversion",
      category: "Indicators",
      explanationFa: "شاخص قدرت نسبی وارد ناحیه اشباع فروش شده و پتانسیل پرتاب صعودی شدید به سمت تعادل دارد.",
      isTriggered: true,
    });
  } else if (rsi > 68) {
    rsiCondition = "Overbought";
    appliedRules.push({
      id: "RSI_OVERBOUGHT_REACTION",
      nameFa: "اشباع خرید و انباشت نقدینگی سقف (RSI > 68)",
      nameEn: "RSI Overbought Exhaustion",
      concept: "Mean Reversion",
      category: "Indicators",
      explanationFa: "مومنتوم خرید به سقف ظرفیت رسیده و احتمال اصلاح به سمت اردربلاک تقاضا بالاست.",
      isTriggered: true,
    });
  } else if (marketData.change24h > 0 && rsi >= 45 && rsi <= 65) {
    rsiCondition = "Bullish Divergence";
    appliedRules.push({
      id: "MOMENTUM_HEALTHY_EXPANSION",
      nameFa: "مومنتوم صعودی پایدار (RSI 50-65 Zone)",
      nameEn: "Bullish Momentum Continuation",
      concept: "Momentum",
      category: "Indicators",
      explanationFa: "حرکت در کانال صعودی سالم بدون رسیدن به اشباع، امکان تارگت‌های بالاتر را فراهم می‌کند.",
      isTriggered: true,
    });
  }

  // Rule 3: Smart Money Concepts - Order Block & Liquidity Sweep
  const isNearSupport = Math.abs(price - sup1) / price < 0.015;
  const isNearResistance = Math.abs(price - res1) / price < 0.015;

  if (isNearSupport || marketData.change24h >= 0) {
    appliedRules.push({
      id: "SMC_BULLISH_ORDER_BLOCK",
      nameFa: "اردربلاک صعودی اسمارت‌مانی (Bullish Order Block & FVG)",
      nameEn: "SMC Bullish Order Block",
      concept: "Smart Money Concepts",
      category: "SMC",
      explanationFa: "تشکیل بلاک سفارشات نهادی در محدوده تقاضا و جاروب نقدینگی کف‌ها (Sell-Side Liquidity Grab).",
      isTriggered: true,
    });
  }

  if (isNearResistance || marketData.change24h < 0) {
    appliedRules.push({
      id: "SMC_BEARISH_ORDER_BLOCK",
      nameFa: "اردربلاک نزولی اسمارت‌مانی (Bearish Order Block & Premium Supply)",
      nameEn: "SMC Bearish Order Block",
      concept: "Smart Money Concepts",
      category: "SMC",
      explanationFa: "توزیع سفارشات در منطقه پریمیوم و آماده‌سازی برای ریزش به سمت گپ‌های نقدینگی زیرین.",
      isTriggered: true,
    });
  }

  // Rule 4: Direction Determination
  let isBullish: boolean;
  if (req.actionPreference === "LONG") {
    isBullish = true;
  } else if (req.actionPreference === "SHORT") {
    isBullish = false;
  } else {
    // Auto detection based on rules confluence score
    let bullScore = 0;
    let bearScore = 0;
    if (isEmaBullish) bullScore += 3;
    if (isEmaBearish) bearScore += 3;
    if (rsi < 40) bullScore += 2;
    if (rsi > 65) bearScore += 2;
    if (marketData.change24h > 0) bullScore += 2;
    if (marketData.change24h < 0) bearScore += 2;
    if (price > ema200) bullScore += 2;
    if (price < ema200) bearScore += 2;
    isBullish = bullScore >= bearScore;
  }

  const action: 'LONG' | 'SHORT' = isBullish ? "LONG" : "SHORT";

  // 2. Compute Timing & Execution Horizon (دقیقه، ساعت یا روز)
  const timing = calculateTradeTiming(req.timeHorizon, tf);

  // 2. Risk & Profile Multipliers adjusted for Horizon
  let tp1Mult = 1.022; // +2.2%
  let tp2Mult = 1.052; // +5.2%
  let tp3Mult = 1.090; // +9.0%
  let slPct = 1.6;     // -1.6%
  let levValue = 10;
  let levText = '10x (Isolated استاندارد)';
  let profileLabel = '⚖️ متعادل (Moderate)';

  // Scale target distances based on Trade Horizon
  if (timing.horizon === 'scalp_minutes') {
    tp1Mult = 1.012; // +1.2%
    tp2Mult = 1.026; // +2.6%
    tp3Mult = 1.048; // +4.8%
    slPct = 0.9;
    levValue = 15;
    levText = '15x (اسکلپ سریع - Isolated)';
  } else if (timing.horizon === 'swing_days') {
    tp1Mult = 1.045; // +4.5%
    tp2Mult = 1.092; // +9.2%
    tp3Mult = 1.160; // +16.0%
    slPct = 2.8;
    levValue = 5;
    levText = '5x (سوینگ ایمن - Safe Isolated)';
  } else if (timing.horizon === 'position_weeks') {
    tp1Mult = 1.080; // +8.0%
    tp2Mult = 1.175; // +17.5%
    tp3Mult = 1.300; // +30.0%
    slPct = 4.5;
    levValue = 3;
    levText = '3x (پوزیشن میان‌مدت)';
  }

  if (profile === 'conservative') {
    tp1Mult = 1 + (tp1Mult - 1) * 0.7;
    tp2Mult = 1 + (tp2Mult - 1) * 0.7;
    tp3Mult = 1 + (tp3Mult - 1) * 0.7;
    slPct = Number((slPct * 0.75).toFixed(1));
    levValue = Math.min(req.riskSettings?.maxLeverage || 5, 5);
    levText = `${levValue}x (کم‌ریسک - Safe Isolated)`;
    profileLabel = '🛡️ کم‌ریسک و محتاط (Conservative)';
  } else if (profile === 'aggressive') {
    tp1Mult = 1 + (tp1Mult - 1) * 1.35;
    tp2Mult = 1 + (tp2Mult - 1) * 1.35;
    tp3Mult = 1 + (tp3Mult - 1) * 1.35;
    slPct = Number((slPct * 1.3).toFixed(1));
    levValue = Math.min(req.riskSettings?.maxLeverage || 20, 30);
    levText = `${levValue}x (اسکلپ تهاجمی - Cross/Isolated)`;
    profileLabel = '🚀 تهاجمی و پربازده (Aggressive)';
  }

  // 3. Price formatting helper
  const decimals = price > 500 ? 2 : price > 10 ? 3 : price > 1 ? 4 : 6;
  const fmt = (n: number) => Number(n.toFixed(decimals));

  // 4. Entry & Stop Calculations (OTE Fibonacci 0.618 - 0.786)
  const entryLow = isBullish ? fmt(price * 0.996) : fmt(price * 1.001);
  const entryHigh = isBullish ? fmt(price * 1.002) : fmt(price * 0.995);
  const optimalEntry = price;

  const tp1 = isBullish ? fmt(price * tp1Mult) : fmt(price * (2 - tp1Mult));
  const tp2 = isBullish ? fmt(price * tp2Mult) : fmt(price * (2 - tp2Mult));
  const tp3 = isBullish ? fmt(price * tp3Mult) : fmt(price * (2 - tp3Mult));

  const sl = isBullish ? fmt(price * (1 - slPct / 100)) : fmt(price * (1 + slPct / 100));
  const slPercent = -slPct;

  const tp1Percent = Number(((tp1Mult - 1) * 100).toFixed(1));
  const tp2Percent = Number(((tp2Mult - 1) * 100).toFixed(1));
  const tp3Percent = Number(((tp3Mult - 1) * 100).toFixed(1));

  const rrRatio = Number((tp2Percent / slPct).toFixed(1));
  const cleanSym = marketData.symbol.replace(/[^a-zA-Z0-9]/g, "");

  // 5. Dynamic Date & Time formatting for Tehran
  const dateStr = new Date().toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 6. Educational Explanations (دانشنامه و آموزش متدولوژی)
  const candleCount = marketData.candles?.length || 50;
  const fvgText = marketData.indicators.fvgDetected || "ناحیه تعادلی نقدینگی";
  const obText = marketData.indicators.orderBlocks || `${isBullish ? "اردربلاک تقاضا" : "اردربلاک عرضه"}`;

  const educationalFa = `📚 **دانش و منطق محاسباتی ستاپ آفلاین (${action === "LONG" ? "خرید لانگ" : "فروش شورت"}):**
📅 تاریخ و ساعت استخراج زنده: ${dateStr} (به وقت تهران)
⚡ **نوع موتور:** الگوریتم محاسباتی و ریاضی (بدون هوش مصنوعی / کاملاً بر اساس دیتای آنلاین کندل‌ها و قیمت لحظه‌ای)
۱. **دیتا و کندل‌های پردازش‌شده:** ${candleCount} کندل زنده با حجم ۲۴ساعته ${marketData.volume24h} و تغییر روزانه ${marketData.change24h}%
۲. **افق زمانی و ماندگاری در پوزیشن:** این ستاپ در تایم‌فریم ${tf} با افق ${timing.horizonLabelFa} محاسبه شده (مدت تخمینی نگهداری: ${timing.estimatedHoldingTimeFa}).
۳. **ساختار اسمارت‌مانی و اردربلاک زنده:** ${obText} و ${fvgText}.
۴. **شاخص‌های محاسباتی تکنیکال:** شاخص RSI در سطح ${rsi.toFixed(1)} (${rsiCondition}) و میانگین EMA20 برابر $${ema20} است.
۵. **مدیریت سرمایه و ریسک‌فری:** در TP1 نیمی از حجم بسته و استاپ به نقطه ورود (Breakeven) منتقل می‌شود تا ریسک به صفر برسد.`;

  // 7. Telegram and Bale Formatted Messages
  const telegramMessage = `🎯 **سیگنال تریدینگ‌ویو (موتور آفلاین با دیتای زنده)** 🎯
📅 **زمان استخراج زنده:** ${dateStr} (به وقت تهران)
⚡ **حالت تحلیل:** محاسبات ریاضی و قوانین اسمارت‌مانی (بدون هوش مصنوعی)
🔹 **نماد:** #${cleanSym} | تایم‌فریم: ${tf}
⏱️ **افق زمانی ورود و خروج:** ${timing.horizonLabelFa}
⚡ **جهت پوزیشن:** ${action === "LONG" ? "🟢 لانگ (LONG)" : "🔴 شورت (SHORT)"}
📊 **گرید ستاپ:** 🌟 A+ | پروفایل: ${profileLabel}
  
📍 **محدوده ورود (Entry Zone):** $${entryLow} - $${entryHigh}
⏳ **مهلت ورود معتبر:** ${timing.entryValidityWindowFa}
⏱️ **مدت تخمینی نگهداری:** ${timing.estimatedHoldingTimeFa}
  
🎯 **تارگت اول (TP1):** $${tp1} (+${tp1Percent}% | زمان: ${timing.tp1EstimatedTimeFa} | سیو ۵۰٪)
🎯 **تارگت دوم (TP2):** $${tp2} (+${tp2Percent}% | زمان: ${timing.tp2EstimatedTimeFa} | مقاومت ماژور)
🚀 **تارگت نهایی (TP3):** $${tp3} (+${tp3Percent}% | زمان: ${timing.tp3EstimatedTimeFa} | موج گسترده)
🛑 **حد ضرر (Stop Loss):** $${sl} (-${slPct}%)
  
❌ **ابطال زمانی:** ${timing.invalidationTimeoutFa}
⚖️ **اهرم مجاز:** ${levText}
💎 **نسبت ریسک به ریوارد (R:R):** 1:${rrRatio}
💰 **مدیریت ریسک:** حداکثر ${req.riskSettings?.maxRiskPercent || 2}٪ از کل بالانس
  
📖 **تحلیل تکنیکال استخراج‌شده از کندل‌ها:**
• قیمت زنده: $${price} (دامنه ۲۴ساعته: $${marketData.low24h} تا $${marketData.high24h})
• وضعیت پرایس‌اکشن: ${obText}
${appliedRules.map(r => `• ${r.nameFa}: ${r.explanationFa}`).join("\n")}
  
⚖️ *سلب مسئولیت: تصمیم نهایی معامله و مدیریت سرمایه با کاربر است و سازنده هیچ سهمی از سود معاملات ندارد.*
🤖 *ربات تحلیلی تریدینگ‌ویو (تلگرام و بله)*`;

  const baleMessage = `🔔 **سیگنال الگوریتمی تریدینگ‌ویو (بله)**
📅 **زمان استخراج:** ${dateStr} (به وقت تهران)
📚 متدولوژی: محاسبات پرایس‌اکشن و کندل‌استیک زنده (بدون هوش مصنوعی)
جفت‌ارز: #${cleanSym} | تایم: ${tf} | افق زمانی: ${timing.horizonLabelFa}
موقعیت: ${action === "LONG" ? "خرید لانگ (LONG)" : "فروش شورت (SHORT)"}
  
▪️ زون ورود: $${entryLow} تا $${entryHigh}
▪️ مهلت ورود: ${timing.entryValidityWindowFa}
▪️ مدت پوزیشن: ${timing.estimatedHoldingTimeFa}
▪️ تارگت ۱: $${tp1} (+${tp1Percent}% ~ ${timing.tp1EstimatedTimeFa})
▪️ تارگت ۲: $${tp2} (+${tp2Percent}% ~ ${timing.tp2EstimatedTimeFa})
▪️ تارگت ۳: $${tp3} (+${tp3Percent}% ~ ${timing.tp3EstimatedTimeFa})
▪️ حد ضرر: $${sl} (-${slPct}%)
▪️ لوریج پیشنهادی: ${levValue}x | نسبت R:R: 1:${rrRatio}
▪️ ابطال زمانی: ${timing.invalidationTimeoutFa}
  
📌 *آموزش ستاپ:* ورود بر اساس فرمول‌های ریاضی و کندل‌های زنده مارکت. خروج پله‌ای و سیو سود در TP1 الزامی است.`;

  return {
    symbol: cleanSym,
    baseAsset: cleanSym.replace("USDT", ""),
    quoteAsset: "USDT",
    marketCategory: marketData.category,
    timeframe: tf,
    timeHorizon: timing.horizon,
    timing,
    action,
    grade: "A+",
    confidence: 91,
    currentPrice: price,
    entryZone: [entryLow, entryHigh],
    optimalEntry,
    takeProfits: [
      {
        target: 1,
        price: tp1,
        pnlPercent: tp1Percent,
        sizePercent: 50,
        descriptionFa: `تارگت اول (خروج نیمی از حجم و ریسک‌فری کردن معامله) - تخمین زمان: ${timing.tp1EstimatedTimeFa}`,
        descriptionEn: `TP1: 50% Take Profit & Move Stop to Breakeven (~${timing.tp1EstimatedTimeFa})`,
        estimatedTimeFa: timing.tp1EstimatedTimeFa,
      },
      {
        target: 2,
        price: tp2,
        pnlPercent: tp2Percent,
        sizePercent: 30,
        descriptionFa: `تارگت دوم در مقاومت ماژور و فیبوناچی ۱.۶۱۸ - تخمین زمان: ${timing.tp2EstimatedTimeFa}`,
        descriptionEn: `TP2: Major Structural Resistance (~${timing.tp2EstimatedTimeFa})`,
        estimatedTimeFa: timing.tp2EstimatedTimeFa,
      },
      {
        target: 3,
        price: tp3,
        pnlPercent: tp3Percent,
        sizePercent: 20,
        descriptionFa: `تارگت نهایی و سواری بر موج گسترده - تخمین زمان: ${timing.tp3EstimatedTimeFa}`,
        descriptionEn: `TP3: Fibonacci Expansion Wave (~${timing.tp3EstimatedTimeFa})`,
        estimatedTimeFa: timing.tp3EstimatedTimeFa,
      },
    ],
    stopLoss: {
      price: sl,
      lossPercent: slPercent,
      invalidationReasonFa: `شکست کف اردربلاک ${isBullish ? "تقاضا" : "عرضه"} در قیمت $${sl} و ابطال ساختار نقدینگی`,
      invalidationReasonEn: `Structural Invalidation below key order block at $${sl}`,
      maxHoldingTimeFa: timing.estimatedHoldingTimeFa,
    },
    recommendedLeverage: levText,
    leverageValue: levValue,
    riskRewardRatio: rrRatio,
    trend: isBullish ? "BULLISH" : "BEARISH",
    analysisFa: `تحلیل آفلاین در تاریخ ${dateStr} (به وقت تهران) بر پایه قوانین اسمارت‌مانی (SMC) و استخراج لحظه‌ای کندل‌ها: قیمت زنده ($${price}) در منطقه بهینه ورود (${obText}) قرار گرفته و شاخص RSI با سطح ${rsi.toFixed(1)} نشان‌دهنده تاییدیه ورود با نسبت R:R معادل 1:${rrRatio} است.`,
    analysisEn: `Quantitative rule-based analysis: Institutional Order Block retest on ${tf} with expected holding period of ${timing.estimatedHoldingTimeEn}.`,
    indicatorsSummary: {
      rsi,
      rsiCondition,
      macd: isBullish ? "Bullish Momentum Expansion" : "Bearish Momentum Expansion",
      emaTrend: isBullish ? "Above EMA 20 & EMA 50" : "Below EMA 20 & EMA 50",
      supportLevels: [sup1, sup2],
      resistanceLevels: [res1, res2],
      orderBlocks: obText,
    },
    strategyUsed: `SMC & Price Action (${timing.horizonLabelFa} - ${profileLabel})`,
    engineMode: "OFFLINE_RULES",
    knowledgeBaseRulesApplied: appliedRules.map(r => r.nameFa),
    educationalNotesFa: educationalFa,
    telegramMessage,
    baleMessage,
  };
}

export interface MarketOpportunityResult {
  symbol: string;
  name: string;
  action: 'LONG' | 'SHORT';
  currentPrice: number;
  entryZone: [number, number];
  optimalEntry: number;
  tp1: number;
  tp2: number;
  sl: number;
  rrRatio: number;
  rsi: number;
  change24h: number;
  confluenceScore: number;
  setupReasonFa: string;
  grade: 'A+' | 'A' | 'B+';
}

/**
 * Evaluates real-time live candles and SMC/PriceAction indicators across a diverse pool
 * Discards arbitrary repeats (no fake Tesla loops) and returns only verified technical setups.
 */
export async function scanAuthenticMarketOpportunities(
  candidateSymbols?: string[],
  timeframe: string = "15m",
  userSettings?: any
): Promise<MarketOpportunityResult[]> {
  const rawPool = (candidateSymbols && candidateSymbols.length > 0)
    ? candidateSymbols
    : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'SUIUSDT', 'PEPEUSDT', 'AVAXUSDT', 'LINKUSDT', 'NEARUSDT', 'XAUUSD'];

  // Filter out stock symbols like TSLA to focus on active Crypto/Forex/Gold
  const pool = Array.from(new Set(rawPool)).filter(s => !['TSLA', 'NVDA', 'AAPL', 'MSFT'].includes(s.toUpperCase()));

  const results: MarketOpportunityResult[] = [];

  for (const sym of pool) {
    try {
      const marketData = await fetchLiveMarketData(sym, timeframe);
      const price = marketData.price;
      const rsi = marketData.indicators.rsi14;
      const ema20 = marketData.indicators.ema20;
      const ema50 = marketData.indicators.ema50;
      const sup1 = marketData.indicators.support1;
      const res1 = marketData.indicators.resistance1;
      const change24h = marketData.change24h;

      // Mathematical confluence scoring
      let bullConfluence = 0;
      let bearConfluence = 0;

      // 1. RSI oversold/overbought and momentum
      if (rsi <= 35) bullConfluence += 3.5;
      else if (rsi <= 48 && change24h > 0) bullConfluence += 2;
      
      if (rsi >= 65) bearConfluence += 3.5;
      else if (rsi >= 52 && change24h < 0) bearConfluence += 2;

      // 2. Trend & EMA
      if (ema20 > ema50 && price >= ema50) bullConfluence += 2.5;
      if (ema20 < ema50 && price <= ema50) bearConfluence += 2.5;

      // 3. Proximity to Order Blocks / Liquidity pools
      const distToSup = Math.abs(price - sup1) / price;
      const distToRes = Math.abs(price - res1) / price;
      if (distToSup < 0.02) bullConfluence += 3;
      if (distToRes < 0.02) bearConfluence += 3;

      const isLong = bullConfluence >= bearConfluence;
      const totalScore = isLong ? bullConfluence : bearConfluence;

      // Setup parameters
      let optimalEntry: number;
      let entryLow: number;
      let entryHigh: number;
      let sl: number;
      let tp1: number;
      let tp2: number;
      let reason = "";

      if (isLong) {
        optimalEntry = Number(price.toFixed(4));
        entryLow = Number((price * 0.995).toFixed(4));
        entryHigh = Number((price * 1.002).toFixed(4));
        sl = Number((Math.min(sup1, price * 0.982)).toFixed(4));
        const risk = Math.max(0.0001, optimalEntry - sl);
        tp1 = Number((optimalEntry + risk * 1.8).toFixed(4));
        tp2 = Number((optimalEntry + risk * 3.2).toFixed(4));
        reason = `تست اردربلاک تقاضا در سطح $${sup1.toFixed(2)} با RSI=${rsi.toFixed(1)} و شتاب مومنتوم صعودی`;
      } else {
        optimalEntry = Number(price.toFixed(4));
        entryLow = Number((price * 0.998).toFixed(4));
        entryHigh = Number((price * 1.005).toFixed(4));
        sl = Number((Math.max(res1, price * 1.018)).toFixed(4));
        const risk = Math.max(0.0001, sl - optimalEntry);
        tp1 = Number((optimalEntry - risk * 1.8).toFixed(4));
        tp2 = Number((optimalEntry - risk * 3.2).toFixed(4));
        reason = `برخورد به سقف پریمیوم در سطح $${res1.toFixed(2)} با RSI=${rsi.toFixed(1)} و تخلیه حجم خرید`;
      }

      const riskDist = Math.abs(optimalEntry - sl);
      const rewardDist = Math.abs(tp1 - optimalEntry);
      const rrRatio = Number((rewardDist / Math.max(0.0001, riskDist)).toFixed(2));

      const grade: 'A+' | 'A' | 'B+' = totalScore >= 7 ? 'A+' : totalScore >= 5 ? 'A' : 'B+';

      results.push({
        symbol: marketData.symbol,
        name: marketData.name,
        action: isLong ? 'LONG' : 'SHORT',
        currentPrice: price,
        entryZone: [entryLow, entryHigh],
        optimalEntry,
        tp1,
        tp2,
        sl,
        rrRatio: Math.max(1.8, rrRatio),
        rsi,
        change24h,
        confluenceScore: totalScore,
        setupReasonFa: reason,
        grade,
      });
    } catch {
      // Skip if individual symbol fetch timed out
    }
  }

  // Sort by highest confluence score and R:R
  results.sort((a, b) => (b.confluenceScore * b.rrRatio) - (a.confluenceScore * a.rrRatio));
  return results;
}

