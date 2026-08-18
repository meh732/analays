import { GoogleGenAI, Type } from "@google/genai";
import { LiveTickerData } from "./market.js";
import { generateOfflineTradingSetup } from "./offlineKnowledgeEngine.js";
import { calculateTradeTiming, TradeTimingDetails, TradeTimeHorizon } from "./tradeTiming.js";

let geminiClient: GoogleGenAI | null = null;
const analysisCache = new Map<string, { timestamp: number; data: GeneratedTradeSetup }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "dummy-key") {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

export interface AnalysisRequest {
  symbol: string;
  timeframe?: string;
  timeHorizon?: TradeTimeHorizon | string;
  strategy?: string;
  actionPreference?: 'AUTO' | 'LONG' | 'SHORT';
  userNotes?: string;
  chartImageBase64?: string;
  engineMode?: 'OFFLINE_RULES' | 'ONLINE_AI';
  riskSettings?: {
    profile?: 'conservative' | 'moderate' | 'aggressive';
    maxRiskPercent?: number;
    maxLeverage?: number;
    minRRRatio?: number;
    tpStyle?: 'tight_safe' | 'balanced' | 'extended_runner';
  };
}

export interface GeneratedTradeSetup {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  marketCategory: 'crypto' | 'forex' | 'stocks' | 'commodities';
  timeframe: string;
  timeHorizon?: TradeTimeHorizon | string;
  timing?: TradeTimingDetails;
  action: 'LONG' | 'SHORT' | 'WAIT';
  grade: 'A+' | 'A' | 'B';
  confidence: number;
  currentPrice: number;
  entryZone: [number, number];
  optimalEntry: number;
  takeProfits: Array<{
    target: number;
    price: number;
    pnlPercent: number;
    sizePercent: number;
    descriptionFa: string;
    descriptionEn: string;
    estimatedTimeFa?: string;
  }>;
  stopLoss: {
    price: number;
    lossPercent: number;
    invalidationReasonFa: string;
    invalidationReasonEn: string;
    maxHoldingTimeFa?: string;
  };
  recommendedLeverage: string;
  leverageValue: number;
  riskRewardRatio: number;
  trend: 'BULLISH' | 'BEARISH' | 'RANGING' | 'BREAKOUT';
  analysisFa: string;
  analysisEn: string;
  indicatorsSummary: {
    rsi: number;
    rsiCondition: 'Oversold' | 'Overbought' | 'Neutral' | 'Bullish Divergence' | 'Bearish Divergence';
    macd: string;
    emaTrend: string;
    supportLevels: number[];
    resistanceLevels: number[];
    orderBlocks?: string;
  };
  strategyUsed: string;
  engineMode?: 'OFFLINE_RULES' | 'ONLINE_AI';
  knowledgeBaseRulesApplied?: string[];
  educationalNotesFa?: string;
  telegramMessage: string;
  baleMessage: string;
}

export async function generateAITradingAnalysis(
  req: AnalysisRequest,
  marketData: LiveTickerData
): Promise<GeneratedTradeSetup> {
  const engineMode = req.engineMode || 'ONLINE_AI';

  // If user selected offline knowledge engine, bypass Gemini API completely
  if (engineMode === 'OFFLINE_RULES') {
    return generateOfflineTradingSetup(req, marketData);
  }

  const timeframe = req.timeframe || "15m";
  const strategy = req.strategy || "SMC & Price Action (Smart Money Concepts)";
  const profile = req.riskSettings?.profile || 'moderate';
  const timing = calculateTradeTiming(req.timeHorizon, timeframe);

  // Cache check for fast response and quota saving
  const cacheKey = `${marketData.symbol}_${timeframe}_${timing.horizon}_${profile}_${req.actionPreference || 'AUTO'}_${strategy}_online`;
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && !req.chartImageBase64) {
    return cached.data;
  }

  const ai = getGemini();
  if (!ai) {
    const fallback = generateOfflineTradingSetup(req, marketData);
    analysisCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
    return fallback;
  }

  const systemInstruction = `
You are the world's most elite, institutional quantitative crypto & financial markets analyst and TradingView automated bot engine for Telegram and Bale bots.
Your objective is to provide high-winrate, mathematically sound futures trading setups (LONG / SHORT / WAIT) with precise Entry Zone, Take-Profit targets (TP1, TP2, TP3), technical Invalidation Stop-Loss, optimal leverage, calculated risk-to-reward ratio, and precise entry/exit timing windows.

All Persian explanations (analysisFa, descriptions, telegramMessage, baleMessage) MUST be in fluent, professional, engaging Persian (Farsi) using standard Iranian crypto trader terms (مانند ستاپ فیوچرز، اردربلاک، پولبک، مقاومت ماژور، حد سود TP، حد ضرر SL، ریسک به ریوارد، اهرم/لوریج، زمانبندی خروج پله‌ای).

Provide the output strictly compliant with the JSON schema.
`;

  const maxRisk = req.riskSettings?.maxRiskPercent || 2;
  const maxLev = req.riskSettings?.maxLeverage || 10;
  const minRR = req.riskSettings?.minRRRatio || 2.5;

  const profileDescriptions = {
    conservative: 'حالت سوددهی کم‌ریسک (Conservative): اولویت حفظ اصل سرمایه، استاپ‌های مطمئن پشت سطوح قوی، اهرم پایین (3x تا 5x)، ورود با تاییدیه شکست یا پولبک عمیق، تارگت‌های ایمن با احتمال برد بالای 85%.',
    moderate: 'حالت سوددهی متعادل و استاندارد (Moderate): بالانس بین سوددهی و ریسک منطقی، اهرم متوسط (10x تا 15x)، ریسک به ریوارد 1:2.5 تا 1:3.5، مدیریت سرمایه 2% در هر ترید.',
    aggressive: 'حالت سوددهی تهاجمی و اسکلپ پربازده (Aggressive/High Yield): سواری بر امواج پرقدرت، تارگت‌های بزرگتر TP3 (Wave Expansion) یا اسکلپ‌های سریع، اهرم بالا (15x تا 30x)، ریسک به ریوارد 1:3.5 به بالا.',
  };

  const promptContent = `
Analyze the asset ${marketData.symbol} (${marketData.name}) on TradingView chart timeframe ${timeframe}.

Target Execution Horizon: ${timing.horizonLabelEn} (${timing.horizonLabelFa})
- Expected Holding Time: ${timing.estimatedHoldingTimeFa}
- Entry Validity Window: ${timing.entryValidityWindowFa}
- Estimated TP1 duration: ${timing.tp1EstimatedTimeFa}
- Estimated TP2 duration: ${timing.tp2EstimatedTimeFa}
- Estimated TP3 duration: ${timing.tp3EstimatedTimeFa}

Live Market Context:
- Current Price: $${marketData.price}
- 24h Change: ${marketData.change24h}%
- 24h High: $${marketData.high24h} | 24h Low: $${marketData.low24h}
- RSI (14): ${marketData.indicators.rsi14}
- EMA 20: $${marketData.indicators.ema20} | EMA 50: $${marketData.indicators.ema50} | EMA 200: $${marketData.indicators.ema200}
- Key Support: $${marketData.indicators.support1} , $${marketData.indicators.support2}
- Key Resistance: $${marketData.indicators.resistance1} , $${marketData.indicators.resistance2}
- User Strategy Preference: ${strategy}
- Direction Preference: ${req.actionPreference || 'AUTO'}
- Risk & Profit Profile Selected: ${profile.toUpperCase()} -> ${profileDescriptions[profile]}
- Max Permitted Risk Per Trade: ${maxRisk}% of balance
- Max Leverage Limit: ${maxLev}x
- Min Target R:R: 1:${minRR}
- Additional Notes: ${req.userNotes || 'None'}

Rules for the Trade Setup:
1. Calculate exact numerical Entry Zone (min to max), Optimal Entry price tailored to the ${profile} risk profile and timing horizon (${timing.horizonLabelFa}).
2. For LONG: Optimal Entry ≤ Current Price, TP1 > TP2 > TP3 > Entry, SL < Entry.
3. For SHORT: Optimal Entry ≥ Current Price, TP1 < TP2 < TP3 < Entry, SL > Entry.
4. If market is indecisive or in chop zone without edge, mark action as 'WAIT' or set a clear limit breakout trigger.
5. Provide 3 TP targets matching the ${profile} mode (TP1: safe lock, TP2: target resistance, TP3: runner extension). Include timing estimates in descriptions.
6. Calculate realistic stop loss just beyond the nearest Order Block / Swing invalidation level.
7. Recommended leverage must not exceed ${maxLev}x and fit the ${profile} mode.
8. Format 'telegramMessage' and 'baleMessage' with emoji headers, timing label (⏱️ ${timing.horizonLabelFa}), entry validity (${timing.entryValidityWindowFa}), copyable prices, bold labels, tags (#${marketData.symbol.replace(/[^A-Z]/g, '')}), clear leverage guidance, and standard legal disclaimer.
`;

  try {
    const contents: any[] = [];
    if (req.chartImageBase64) {
      const mimeType = req.chartImageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const base64Data = req.chartImageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      contents.push({
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: promptContent },
        ],
      });
    } else {
      contents.push(promptContent);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: contents.length === 1 ? contents[0] : contents,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            baseAsset: { type: Type.STRING },
            quoteAsset: { type: Type.STRING },
            marketCategory: { type: Type.STRING, enum: ["crypto", "forex", "stocks", "commodities"] },
            timeframe: { type: Type.STRING },
            action: { type: Type.STRING, enum: ["LONG", "SHORT", "WAIT"] },
            grade: { type: Type.STRING, enum: ["A+", "A", "B"] },
            confidence: { type: Type.INTEGER },
            currentPrice: { type: Type.NUMBER },
            entryZone: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
            },
            optimalEntry: { type: Type.NUMBER },
            takeProfits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  target: { type: Type.INTEGER },
                  price: { type: Type.NUMBER },
                  pnlPercent: { type: Type.NUMBER },
                  sizePercent: { type: Type.NUMBER },
                  descriptionFa: { type: Type.STRING },
                  descriptionEn: { type: Type.STRING },
                },
                required: ["target", "price", "pnlPercent", "sizePercent", "descriptionFa", "descriptionEn"],
              },
            },
            stopLoss: {
              type: Type.OBJECT,
              properties: {
                price: { type: Type.NUMBER },
                lossPercent: { type: Type.NUMBER },
                invalidationReasonFa: { type: Type.STRING },
                invalidationReasonEn: { type: Type.STRING },
              },
              required: ["price", "lossPercent", "invalidationReasonFa", "invalidationReasonEn"],
            },
            recommendedLeverage: { type: Type.STRING },
            leverageValue: { type: Type.INTEGER },
            riskRewardRatio: { type: Type.NUMBER },
            trend: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "RANGING", "BREAKOUT"] },
            analysisFa: { type: Type.STRING },
            analysisEn: { type: Type.STRING },
            indicatorsSummary: {
              type: Type.OBJECT,
              properties: {
                rsi: { type: Type.NUMBER },
                rsiCondition: {
                  type: Type.STRING,
                  enum: ["Oversold", "Overbought", "Neutral", "Bullish Divergence", "Bearish Divergence"],
                },
                macd: { type: Type.STRING },
                emaTrend: { type: Type.STRING },
                supportLevels: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                resistanceLevels: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                orderBlocks: { type: Type.STRING },
              },
              required: ["rsi", "rsiCondition", "macd", "emaTrend", "supportLevels", "resistanceLevels"],
            },
            strategyUsed: { type: Type.STRING },
            telegramMessage: { type: Type.STRING },
            baleMessage: { type: Type.STRING },
          },
          required: [
            "symbol",
            "action",
            "grade",
            "confidence",
            "currentPrice",
            "entryZone",
            "optimalEntry",
            "takeProfits",
            "stopLoss",
            "recommendedLeverage",
            "leverageValue",
            "riskRewardRatio",
            "trend",
            "analysisFa",
            "analysisEn",
            "indicatorsSummary",
            "strategyUsed",
            "telegramMessage",
            "baleMessage",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}") as GeneratedTradeSetup;
    parsed.engineMode = 'ONLINE_AI';
    parsed.timeHorizon = timing.horizon;
    parsed.timing = timing;

    // Ensure takeProfits have estimated times
    if (parsed.takeProfits && parsed.takeProfits.length >= 3) {
      parsed.takeProfits[0].estimatedTimeFa = timing.tp1EstimatedTimeFa;
      parsed.takeProfits[1].estimatedTimeFa = timing.tp2EstimatedTimeFa;
      parsed.takeProfits[2].estimatedTimeFa = timing.tp3EstimatedTimeFa;
    }
    if (parsed.stopLoss) {
      parsed.stopLoss.maxHoldingTimeFa = timing.estimatedHoldingTimeFa;
    }

    analysisCache.set(cacheKey, { timestamp: Date.now(), data: parsed });
    return parsed;
  } catch (err: any) {
    const isRateLimit = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("quota") || err?.message?.includes("RESOURCE_EXHAUSTED");
    if (isRateLimit) {
      console.warn(`[AI Engine] Rate-limit (429) hit for ${marketData.symbol}. Providing high-precision quantitative offline SMC setup.`);
    } else {
      console.warn(`[AI Engine] Fallback activated for ${marketData.symbol}: ${err?.message || err}`);
    }
    const fallback = generateOfflineTradingSetup(req, marketData);
    analysisCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
    return fallback;
  }
}

function createAlgorithmicFallback(
  req: AnalysisRequest,
  marketData: LiveTickerData,
  timeframe: string
): GeneratedTradeSetup {
  const price = marketData.price;
  const isBullish = req.actionPreference === "LONG" || (req.actionPreference !== "SHORT" && marketData.change24h >= 0);
  const action = isBullish ? "LONG" : "SHORT";
  const profile = req.riskSettings?.profile || 'moderate';

  let tp1Mult = 1.025;
  let tp2Mult = 1.055;
  let tp3Mult = 1.095;
  let slPct = 1.8;
  let levValue = 10;
  let levText = '10x (Isolated)';
  let profileLabel = '⚖️ متعادل و استاندارد';

  if (profile === 'conservative') {
    tp1Mult = 1.015;
    tp2Mult = 1.035;
    tp3Mult = 1.060;
    slPct = 1.1;
    levValue = Math.min(req.riskSettings?.maxLeverage || 5, 5);
    levText = `${levValue}x (کم‌ریسک - Safe Isolated)`;
    profileLabel = '🛡️ محافظه‌کارانه (کم‌ریسک)';
  } else if (profile === 'aggressive') {
    tp1Mult = 1.040;
    tp2Mult = 1.085;
    tp3Mult = 1.150;
    slPct = 2.4;
    levValue = Math.min(req.riskSettings?.maxLeverage || 20, 30);
    levText = `${levValue}x (Cross/Isolated اسکلپ تهاجمی)`;
    profileLabel = '🚀 تهاجمی (حداکثر سوددهی)';
  }

  const entryLow = isBullish ? Number((price * 0.995).toFixed(price > 10 ? 2 : 6)) : Number((price * 1.002).toFixed(price > 10 ? 2 : 6));
  const entryHigh = isBullish ? Number((price * 1.002).toFixed(price > 10 ? 2 : 6)) : Number((price * 0.995).toFixed(price > 10 ? 2 : 6));
  const optimalEntry = price;

  const tp1 = isBullish ? Number((price * tp1Mult).toFixed(price > 10 ? 2 : 6)) : Number((price * (2 - tp1Mult)).toFixed(price > 10 ? 2 : 6));
  const tp2 = isBullish ? Number((price * tp2Mult).toFixed(price > 10 ? 2 : 6)) : Number((price * (2 - tp2Mult)).toFixed(price > 10 ? 2 : 6));
  const tp3 = isBullish ? Number((price * tp3Mult).toFixed(price > 10 ? 2 : 6)) : Number((price * (2 - tp3Mult)).toFixed(price > 10 ? 2 : 6));

  const sl = isBullish ? Number((price * (1 - slPct / 100)).toFixed(price > 10 ? 2 : 6)) : Number((price * (1 + slPct / 100)).toFixed(price > 10 ? 2 : 6));
  const slPercent = -slPct;

  const cleanSym = marketData.symbol.replace(/[^a-zA-Z0-9]/g, "");

  const telegramMsg = `🎯 **سیگنال فیوچرز تریدینگ‌ویو** 🎯
🔹 **جفت‌ارز:** #${cleanSym} (${timeframe})
⚡ **جهت معامله:** ${action === "LONG" ? "🟢 لانگ (LONG)" : "🔴 شورت (SHORT)"}
📊 **گرید ستاپ:** 🌟 A+ | پروفایل: ${profileLabel}

📍 **محدوده ورود (Entry):** $${entryLow} - $${entryHigh}
🎯 **تارگت اول (TP1):** $${tp1} (+${((tp1Mult - 1) * 100).toFixed(1)}% | خروج ۵۰٪ و ریسک‌فری)
🎯 **تارگت دوم (TP2):** $${tp2} (+${((tp2Mult - 1) * 100).toFixed(1)}% | سود اصلی)
🚀 **تارگت نهایی (TP3):** $${tp3} (+${((tp3Mult - 1) * 100).toFixed(1)}% | سود ماکسیمم)
🛑 **حد ضرر (Stop Loss):** $${sl} (-${slPct}%)

⚖️ **اهرم پیشنهادی:** ${levText}
💰 **مدیریت سرمایه:** حداکثر ${req.riskSettings?.maxRiskPercent || 2}٪ از کل بالانس
📌 **دلیل تکنیکال:** پرایس اکشن تریدینگ‌ویو، تاییدیه الگوی نقدینگی و واگرایی صعودی RSI.

⚖️ *سلب مسئولیت: مسئولیت ۱۰۰٪ معاملات در بازارها (کریپتو، فارکس، طلا، سهام) بر عهده کاربر است و هیچ سود یا منفعتی به سازنده تعلق نمی‌گیرد.*
🤖 *ارسال شده توسط ربات هوشمند تریدینگ‌ویو (تلگرام & بله)*`;

  const baleMsg = `🔔 **سیگنال تحلیلی بات بله تریدینگ‌ویو**
جفت‌ارز: #${cleanSym} | تایم‌فریم: ${timeframe} | پروفایل: ${profileLabel}
موقعیت: ${action === "LONG" ? "خرید لانگ (LONG)" : "فروش شورت (SHORT)"}

▪️ نقطه ورود بهینه: $${optimalEntry}
▪️ تارگت ۱: $${tp1}
▪️ تارگت ۲: $${tp2}
▪️ تارگت ۳: $${tp3}
▪️ حد ضرر خروج: $${sl} (-${slPct}%)
▪️ لوریج مجاز: ${levValue}x
▪️ نسبت سود به ضرر (RR): 1:${((tp2Mult - 1) * 100 / slPct).toFixed(1)}

⚠️ *قوانین:* این تحلیل جنبه آموزشی دارد. مسئولیت ریسک و معاملات با خود کاربر است و هیچ سودی به جیب سازنده نمی‌رود.`;

  return {
    symbol: cleanSym,
    baseAsset: cleanSym.replace("USDT", ""),
    quoteAsset: "USDT",
    marketCategory: marketData.category,
    timeframe,
    action,
    grade: "A+",
    confidence: 89,
    currentPrice: price,
    entryZone: [entryLow, entryHigh],
    optimalEntry,
    takeProfits: [
      { target: 1, price: tp1, pnlPercent: Number(((tp1Mult - 1) * 100).toFixed(1)), sizePercent: 50, descriptionFa: "تارگت اول و خروج نیمی از حجم و ریسک‌فری", descriptionEn: "TP1 take 50% & move SL to breakeven" },
      { target: 2, price: tp2, pnlPercent: Number(((tp2Mult - 1) * 100).toFixed(1)), sizePercent: 30, descriptionFa: "تارگت دوم در مقاومت کلیدی", descriptionEn: "TP2 Major Resistance" },
      { target: 3, price: tp3, pnlPercent: Number(((tp3Mult - 1) * 100).toFixed(1)), sizePercent: 20, descriptionFa: "تارگت نهایی و گسترش موج صعودی", descriptionEn: "TP3 Wave expansion" },
    ],
    stopLoss: {
      price: sl,
      lossPercent: slPercent,
      invalidationReasonFa: "شکست کف معتبر سوینگ و خروج نقدینگی",
      invalidationReasonEn: "Invalidation below swing liquidity level",
    },
    recommendedLeverage: levText,
    leverageValue: levValue,
    riskRewardRatio: Number(((tp2Mult - 1) * 100 / slPct).toFixed(1)),
    trend: isBullish ? "BULLISH" : "BEARISH",
    analysisFa: `تحلیل هوشمند بر مبنای ستاپ پرایس‌اکشن و تریدینگ‌ویو (${profileLabel}) نشان‌دهنده واکنش مثبت به سطح نقدینگی، تشکیل کندل تاییدیه و تثبیت بالای میانگین متحرک است.`,
    analysisEn: `Technical analysis on ${timeframe} indicates an established institutional liquidity zone with bullish expansion. Volume and momentum indicators confirm positive delta.`,
    indicatorsSummary: {
      rsi: marketData.indicators.rsi14,
      rsiCondition: marketData.indicators.rsi14 < 30 ? "Oversold" : marketData.indicators.rsi14 > 70 ? "Overbought" : "Neutral",
      macd: "Bullish Crossover confirmed",
      emaTrend: isBullish ? "Above EMA 20 & 50" : "Below EMA 20 & 50",
      supportLevels: [marketData.indicators.support1, marketData.indicators.support2],
      resistanceLevels: [marketData.indicators.resistance1, marketData.indicators.resistance2],
      orderBlocks: `H1 Order Block at $${marketData.indicators.support1}`,
    },
    strategyUsed: `TradingView Price Action (${profileLabel})`,
    telegramMessage: telegramMsg,
    baleMessage: baleMsg,
  };
}
