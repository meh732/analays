import fetch from "node-fetch";
import { POPULAR_MARKETS, fetchLiveMarketData } from "./market.js";
import { generateAITradingAnalysis } from "./gemini.js";
import { sendTelegramMessage, sendBaleMessage } from "./bots.js";
import { getChatSettings, updateChatSettings } from "./botSettingsStore.js";

export function performPositionCalculation(
  balance: number,
  riskPercent: number,
  entryPrice: number,
  stopLossPrice: number,
  symbol: string = "BTCUSDT"
): string {
  const riskAmount = (balance * riskPercent) / 100;
  const difference = Math.abs(entryPrice - stopLossPrice);
  const diffPercent = (difference / entryPrice) * 100;
  
  if (difference === 0 || entryPrice === 0) {
    return "❌ قیمت ورود و حد ضرر نمی‌توانند برابر یا صفر باشند.";
  }
  
  const requiredPositionSize = riskAmount / (diffPercent / 100);
  const recommendedLeverage = Math.max(1, Math.min(30, Math.round(15 / diffPercent)));
  const marginRequired = requiredPositionSize / recommendedLeverage;
  
  return `🧮 **محاسبه‌گر پیشرفته مدیریت سرمایه و مارجین** 🧮
  
📊 **مشخصات معامله (${symbol}):**
• 💵 کل سرمایه شما: $${balance.toLocaleString()}
• 🛡️ درصد ریسک مجاز: ${riskPercent}%
• 🔴 میزان ضرر دلاری مجاز (Risk Amount): $${riskAmount.toFixed(1)}

📐 **محاسبات تکنیکال ورود:**
• 🟢 قیمت ورود پیشنهادی: $${entryPrice.toLocaleString()}
• 🛑 قیمت حد ضرر (SL): $${stopLossPrice.toLocaleString()}
• 📏 فاصله تا استاپ لاس: ${diffPercent.toFixed(2)}%

⚙️ **دستورالعمل مدیریت موقعیت (Position Guide):**
• 📈 حجم کل معامله (Position Size): **$${requiredPositionSize.toFixed(1)}**
• 🚀 اهرم پیشنهادی (Leverage): **${recommendedLeverage}x**
• 💳 مارجین مورد نیاز (Margin): **$${marginRequired.toFixed(1)}**

⚠️ **نکته بسیار مهم:**
همواره معامله را در صرافی با این حجم دلاری باز کنید. اگر اهرم را تغییر دادید، مارجین مورد نیاز عوض می‌شود اما حجم کل معامله (Position Size) باید ثابت بماند تا ریسک دلاری شما دقیقاً برابر $${riskAmount.toFixed(1)} باشد!`;
}

export function saveToHistory(chatId: string | number, setup: any) {
  try {
    const settings = getChatSettings(chatId);
    const historyItem = {
      timestamp: Date.now(),
      symbol: setup.symbol,
      action: setup.action,
      grade: setup.grade || "A",
      optimalEntry: setup.optimalEntry || setup.currentPrice,
      stopLoss: setup.stopLoss?.price || 0,
      tp1: setup.takeProfits?.[0]?.price || 0,
    };
    const currentHistory = (settings as any).history || [];
    const newHistory = [historyItem, ...currentHistory].slice(0, 5);
    updateChatSettings(chatId, { history: newHistory as any });
  } catch (err) {
    console.error("Failed to save to history:", err);
  }
}

export async function handleBotUpdate(botType: "telegram" | "bale", token: string, update: any) {
  try {
    const message = update?.message;
    const callbackQuery = update?.callback_query;

    const sendMessage = async (chatId: string, text: string, options?: any) => {
      if (botType === "telegram") {
        return sendTelegramMessage(token, chatId, text, options);
      } else {
        return sendBaleMessage(token, chatId, text, options);
      }
    };

    const runAction = async (chatId: number, queryData: string) => {
      return handleBotUpdate(botType, token, { callback_query: { message: { chat: { id: chatId } }, data: queryData } });
    };

    const runCommand = async (chatId: number, cmdText: string) => {
      return handleBotUpdate(botType, token, { message: { chat: { id: chatId }, text: cmdText } });
    };

    const legalRulesMessage = `⚖️ **قوانین استفاده و سلب مسئولیت حقوقی ربات تریدینگ‌ویو${botType === "bale" ? " (بله)" : ""}** ⚖️

۱. 👤 **مسئولیت کامل ۱۰۰٪ با کاربر:**
تمامی تحلیل‌ها، نقاط ورود، تارگت‌های TP1, TP2, TP3 و حد ضررها صرفاً محاسبات هوش مصنوعی و کمکی-آموزشی بر اساس پرایس اکشن است. بازارهای مالی همواره همراه با نوسان و ریسک بوده و مسئولیت برد و باخت، دقت یا خطای تحلیل منحصراً بر عهده شخص کاربر است.

۲. 🚫 **عدم هرگونه نفع مالی سازنده (Zero Creator Gain):**
هیچ درصدی از سود معاملات کاربر به سازنده پرداخت نمی‌شود و هیچ سودی به جیب توسعه‌دهنده نمی‌رود. ربات هیچ‌گونه دسترسی به کیف‌پول، سرمایه یا دارایی کاربران در صرافی و بروکر ندارد.

۳. 🌍 **شمول تمامی بازارهای تریدینگ‌ویو (ارزها، فارکس، طلا، سهام):**
این قوانین بدون استثنا شامل کلیه دارایی‌های قابل تحلیل است:
• 🪙 **ارزهای دیجیتال و فیوچرز** (Bitcoin, Ethereum, Solana, Altcoins)
• 💱 **بازار جهانی تبادلات ارزی فارکس** (EUR/USD, GBP/USD, USD/JPY)
• 🥇 **فلزات گرانبها و کامودیتی‌ها** (انس طلا XAU/USD، نقره، نفت)
• 📈 **سهام و شاخص‌های بین‌المللی** (Tesla, Nvidia, Apple, Nasdaq)

۴. 🛡️ **اصول الزامی مدیریت ریسک:**
همواره حد ضرر (Stop Loss) را در صرافی فعال نگه دارید و در هر معامله بیش از ۱٪ تا ۳٪ از کل سرمایه را به خطر نیندازید.`;

    const mainReplyMenu = [
      [{ text: "📊 تحلیل فوری ارزها" }, { text: "🎯 اسکنر هوشمند بازار" }],
      [{ text: "🧠 تحلیل هوش مصنوعی" }, { text: "📚 استراتژی آفلاین SMC" }],
      [{ text: "⚙️ تنظیمات ریسک و سود" }, { text: "🧮 محاسبه حجم و مارجین" }],
      [{ text: "🔍 واچ‌لیست دیده‌بان" }, { text: "📂 تاریخچه و ژورنال" }],
      [{ text: "⚖️ قوانین و سلب مسئولیت حقوقی" }],
    ];

    if (callbackQuery) {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      const settings = getChatSettings(chatId);

      if (data === "/rules" || data === "/disclaimer") {
        await sendMessage(chatId.toString(), legalRulesMessage, {
          inlineKeyboard: [
            [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/main_menu") {
        const platformSuffix = botType === "bale" ? " (بله)" : "";
        const welcome = `👋 **سلام! به بات تریدینگ‌ویو، تحلیل تکنیکال و سیگنال‌های دوگانه (هوش مصنوعی + دانش آفلاین) خوش آمدید${platformSuffix}.**

سیستم دارای دو موتور تولید ستاپ معاملاتی است:
🧠 **۱. هوش مصنوعی آنلاین:** تحلیل بلادرنگ و مولتی‌مدال پرایس اکشن
📚 **۲. دانش و استراتژی آفلاین:** الگوریتم قوانین ثابت اسمارت‌مانی (SMC)، اردربلاک، هانت نقدینگی و فیبوناچی

امکانات پنل به صورت **دکمه‌های شیشه‌ای** و **منوی زیر چت** در دسترس است:`;
        await sendMessage(chatId.toString(), welcome, {
          inlineKeyboard: [
            [
              { text: "🧠 تحلیل زنده BTC (هوش مصنوعی)", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" },
              { text: "📚 ستاپ BTC (دانش آفلاین SMC)", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" },
            ],
            [
              { text: "🧠 تحلیل ETH", callback_data: "/analyze ETHUSDT 15m ONLINE_AI" },
              { text: "🧠 تحلیل SOL", callback_data: "/analyze SOLUSDT 15m ONLINE_AI" },
            ],
            [
              { text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" },
              { text: "⚙️ تنظیمات ریسک و سود", callback_data: "/settings_risk" },
            ],
            [
              { text: "🔔 شکار خودکار فرصت‌ها", callback_data: "/menu_hunter" },
              { text: "🧮 محاسبه‌گر حجم", callback_data: "/calc" },
            ],
            [
              { text: "📂 تاریخچه و ژورنال چت", callback_data: "/history_menu" },
              { text: "🔍 مشاهده واچ‌لیست دیده‌بان", callback_data: "/watchlist_menu" }
            ],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/analyze")) {
        const parts = data.replace("/analyze", "").trim().split(" ");
        const symbol = parts[0]?.toUpperCase() || "BTCUSDT";
        const timeframe = parts[1] || settings.timeframe;
        const engineMode = parts[2] || settings.engineMode;
        const timeHorizon = parts[3] || (timeframe === "1m" || timeframe === "5m" || timeframe === "15m" ? "scalp_minutes" : timeframe === "1h" || timeframe === "4h" ? "intraday_hours" : "swing_days");

        const marketData = await fetchLiveMarketData(symbol);
        const setup = await generateAITradingAnalysis({
          symbol,
          timeframe,
          engineMode: engineMode as any,
          timeHorizon: settings.timeHorizon,
          strategy: settings.strategy,
          actionPreference: settings.directionPreference,
          riskSettings: {
            profile: settings.riskProfile,
            maxRiskPercent: settings.riskPercent,
            maxLeverage: settings.leverage,
            minRRRatio: settings.minRRRatio,
            tpStyle: settings.tpStyle,
          }
        }, marketData);

        saveToHistory(chatId, setup);

        const setupMsg = botType === "telegram" ? setup.telegramMessage : setup.baleMessage;

        await sendMessage(chatId.toString(), setupMsg, {
          inlineKeyboard: [
            [
              { text: `⚡ اسکلپ (دقیقه‌ای)`, callback_data: `/analyze ${symbol} 15m ${engineMode} scalp_minutes` },
              { text: `⏱️ درون‌روز (ساعتی)`, callback_data: `/analyze ${symbol} 1h ${engineMode} intraday_hours` },
              { text: `📅 سوینگ (روزانه)`, callback_data: `/analyze ${symbol} 4h ${engineMode} swing_days` },
            ],
            [
              { text: `🧠 بررسی هوش مصنوعی`, callback_data: `/analyze ${symbol} ${timeframe} ONLINE_AI` },
              { text: `📚 دانش آفلاین (SMC)`, callback_data: `/analyze ${symbol} ${timeframe} OFFLINE_RULES` },
            ],
            [
              { text: "🧮 محاسبه حجم", callback_data: `/calc_setup ${symbol} ${setup.optimalEntry} ${setup.stopLoss.price}` },
              { text: "🎯 اسکنر بازار", callback_data: "/scanner" },
            ],
            [
              { text: "⚙️ تنظیمات ربات", callback_data: "/settings_risk" },
              { text: "🔙 منوی اصلی", callback_data: "/main_menu" },
            ],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/scanner") {
        const setups = await Promise.all(
          POPULAR_MARKETS.slice(0, 3).map(async (m) => {
            const md = await fetchLiveMarketData(m.symbol);
            return generateAITradingAnalysis({
              symbol: m.symbol,
              timeframe: settings.timeframe,
              engineMode: settings.engineMode,
              actionPreference: settings.directionPreference,
              riskSettings: {
                profile: settings.riskProfile,
                maxRiskPercent: settings.riskPercent,
                maxLeverage: settings.leverage,
                minRRRatio: settings.minRRRatio,
                tpStyle: settings.tpStyle,
              }
            }, md);
          })
        );
        const scanHeader = `🎯 **اسکن فوری برترین فرصت‌های بازار** 🎯\n\n`;
        const text = scanHeader + setups.map(s => `🔹 **${s.symbol}**: جهت ${s.action === "LONG" ? "🟢 لانگ" : s.action === "SHORT" ? "🔴 شورت" : "⏳ انتظار"} | ورود: $${s.optimalEntry} | تارگت: $${s.takeProfits[0]?.price}`).join("\n\n");
        await sendMessage(chatId.toString(), text, {
          inlineKeyboard: setups.map(s => [{ text: `📊 دریافت ستاپ کامل ${s.symbol}`, callback_data: `/analyze ${s.symbol}` }]),
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/settings_risk") {
        const profileFa = settings.riskProfile === 'conservative' ? '🛡️ کم‌ریسک' : settings.riskProfile === 'aggressive' ? '🚀 تهاجمی' : '⚖️ متعادل';
        const engineFa = settings.engineMode === 'ONLINE_AI' ? '🧠 هوش مصنوعی آنلاین' : '📚 دانش آفلاین SMC';
        const dirFa = settings.directionPreference === 'LONG' ? "🟢 فقط لانگ (Long-Only)" : settings.directionPreference === 'SHORT' ? "🔴 فقط شورت (Short-Only)" : "↕️ دوطرفه هوشمند (Auto)";
        const horFa = settings.timeHorizon === 'scalp_minutes' ? "⚡ اسکلپ (Scalp)" : settings.timeHorizon === 'swing_days' ? "📅 سوینگ (Swing)" : "⏱️ درون‌روز (Intraday)";
        const tpFa = settings.tpStyle === 'tight_safe' ? "🛡️ سیو سود سریع" : settings.tpStyle === 'extended_runner' ? "🚀 دونده طولانی" : "⚖️ متعادل پله‌ای";

        const platformSuffix = botType === "bale" ? " (بله)" : "";
        const timingMsg = `⚙️ **تنظیمات پیشرفته کاربری ربات تریدینگ‌ویو${platformSuffix}** ⚙️\n\n` +
          `📊 **تنظیمات فعلی فعال شما:**\n` +
          `• 🛡️ پروفایل ریسک: **${profileFa}**\n` +
          `• ⏱️ تایم‌فریم پیش‌فرض: **${settings.timeframe}**\n` +
          `• 🧠 موتور تحلیلی: **${engineFa}**\n` +
          `• 💵 سرمایه معاملاتی: **$${settings.balance.toLocaleString()}**\n` +
          `• ⚖️ درصد ریسک هر معامله: **${settings.riskPercent}%**\n` +
          `• 📚 استراتژی تحلیل: **${settings.strategy}**\n` +
          `• ↕️ جهت ترجیحی پوزیشن: **${dirFa}**\n` +
          `• ⏱️ افق زمانی معامله: **${horFa}**\n` +
          `• 🚀 حداکثر لوریج پوزیشن: **${settings.leverage}x**\n` +
          `• 🎯 سبک توزیع تارگت (TP Style): **${tpFa}**\n` +
          `• 💎 حداقل R:R پوزیشن: **1:${settings.minRRRatio}**\n` +
          `• 🔔 شکارچی خودکار: **${settings.autoHunterEnabled ? "✅ روشن" : "❌ خاموش"}**\n\n` +
          `جهت تغییر تنظیمات، گزینه‌های زیر را لمس کنید:`;

        await sendMessage(chatId.toString(), timingMsg, {
          inlineKeyboard: [
            [
              { text: "🛡️ پروفایل ریسک", callback_data: "/menu_risk" },
              { text: "⏱️ تایم‌فریم", callback_data: "/menu_timeframe" }
            ],
            [
              { text: "🧠 موتور تحلیلی", callback_data: "/menu_engine" },
              { text: "📚 استراتژی تحلیل", callback_data: "/menu_strategy" }
            ],
            [
              { text: "💵 تنظیم بالانس", callback_data: "/menu_balance" },
              { text: "⚖️ درصد ریسک هر پوزیشن", callback_data: "/menu_risk_percent" }
            ],
            [
              { text: "↕️ جهت پوزیشن (Direction)", callback_data: "/menu_direction" },
              { text: "⏱️ افق زمانی (Horizon)", callback_data: "/menu_horizon" }
            ],
            [
              { text: "🚀 تنظیم لوریج (Leverage)", callback_data: "/menu_leverage" },
              { text: "🎯 سبک تارگت (TP Style)", callback_data: "/menu_tp_style" }
            ],
            [
              { text: "💎 حداقل R:R مورد انتظار", callback_data: "/menu_min_rr" },
              { text: "🔔 شکارچی خودکار (Auto Pilot)", callback_data: "/menu_hunter" }
            ],
            [
              { text: "🔙 منوی اصلی ربات", callback_data: "/main_menu" }
            ],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_risk") {
        await sendMessage(chatId.toString(), `🛡️ **انتخاب پروفایل سوددهی و مدیریت ریسک:**\n\n1️⃣ **کم‌ریسک (Conservative)**: لوریج 3x-5x | ریسک ۱٪\n2️⃣ **متعادل (Moderate)**: لوریج 10x-15x | ریسک ۲٪\n3️⃣ **تهاجمی (Aggressive)**: لوریج 20x-30x | اسکلپ پربازده`, {
          inlineKeyboard: [
            [
              { text: "🛡️ کم‌ریسک", callback_data: "/set_risk_conservative" },
              { text: "⚖️ متعادل", callback_data: "/set_risk_moderate" },
              { text: "🚀 تهاجمی", callback_data: "/set_risk_aggressive" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_risk_")) {
        const profile = data.replace("/set_risk_", "");
        const riskVals = profile === 'conservative' ? { riskProfile: 'conservative' as any, riskPercent: 1.0, leverage: 5, minRRRatio: 2.0, tpStyle: 'tight_safe' as any } 
                       : profile === 'aggressive' ? { riskProfile: 'aggressive' as any, riskPercent: 3.5, leverage: 25, minRRRatio: 3.5, tpStyle: 'extended_runner' as any }
                       : { riskProfile: 'moderate' as any, riskPercent: 2.0, leverage: 15, minRRRatio: 2.5, tpStyle: 'balanced' as any };
        updateChatSettings(chatId, riskVals);
        const label = profile === 'conservative' ? '🛡️ کم‌ریسک' : profile === 'aggressive' ? '🚀 تهاجمی' : '⚖️ متعادل';
        await sendMessage(chatId.toString(), `✅ پروفایل ریسک شما به همراه سایر متغیرهای سوددهی متناسب با آن به **${label}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_timeframe") {
        await sendMessage(chatId.toString(), `⏱️ **تایم‌فریم پیش‌فرض برای تحلیل خودکار را انتخاب کنید:**`, {
          inlineKeyboard: [
            [
              { text: "1m", callback_data: "/set_tf_1m" },
              { text: "5m", callback_data: "/set_tf_5m" },
              { text: "15m", callback_data: "/set_tf_15m" }
            ],
            [
              { text: "1h", callback_data: "/set_tf_1h" },
              { text: "4h", callback_data: "/set_tf_4h" },
              { text: "1D", callback_data: "/set_tf_1D" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_tf_")) {
        const tf = data.replace("/set_tf_", "");
        updateChatSettings(chatId, { timeframe: tf as any });
        await sendMessage(chatId.toString(), `✅ تایم‌فریم پیش‌فرض به **${tf}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_engine") {
        await sendMessage(chatId.toString(), `🧠 **موتور تولید ستاپ معاملاتی را انتخاب کنید:**\n\n• **هوش مصنوعی آنلاین:** استفاده از قابلیت تحلیل زنده Gemini AI\n• **قوانین و استراتژی آفلاین:** الگوریتم‌های ثابت SMC به صورت محلی و سریع بدون نیاز به اینترنت`, {
          inlineKeyboard: [
            [{ text: "🧠 هوش مصنوعی زنده (Gemini)", callback_data: "/set_engine_online" }],
            [{ text: "📚 قوانین و استراتژی آفلاین", callback_data: "/set_engine_offline" }],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/set_engine_online") {
        updateChatSettings(chatId, { engineMode: 'ONLINE_AI' });
        await sendMessage(chatId.toString(), `✅ موتور تحلیل به **🧠 هوش مصنوعی آنلاین** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/set_engine_offline") {
        updateChatSettings(chatId, { engineMode: 'OFFLINE_RULES' });
        await sendMessage(chatId.toString(), `✅ موتور تحلیل به **📚 قوانین و استراتژی آفلاین SMC** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_strategy") {
        await sendMessage(chatId.toString(), `📚 **استراتژی پیش‌فرض تحلیل تکنیکال را انتخاب کنید:**`, {
          inlineKeyboard: [
            [{ text: "SMC (اسمارت مانی)", callback_data: "/set_strat_smc" }],
            [{ text: "ICT (اوردر فلو)", callback_data: "/set_strat_ict" }],
            [{ text: "Classic Patterns (الگوهای کلاسیک)", callback_data: "/set_strat_classic" }],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_strat_")) {
        const stratKey = data.replace("/set_strat_", "");
        const label = stratKey === "smc" ? "SMC & Price Action" : stratKey === "ict" ? "ICT & Order Flow" : "Classic Chart Patterns";
        updateChatSettings(chatId, { strategy: label });
        await sendMessage(chatId.toString(), `✅ استراتژی معاملاتی به **${label}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_direction") {
        await sendMessage(chatId.toString(), `↕️ **انتخاب جهت پیش‌فرض پوزیشن‌ها (Direction Preference):**\n\nمی‌توانید فیلتر جهت پوزیشن‌ها را تعیین کنید:`, {
          inlineKeyboard: [
            [
              { text: "↕️ هوشمند و دو طرفه (Auto)", callback_data: "/set_dir_auto" },
            ],
            [
              { text: "🟢 فقط خرید (Long-Only)", callback_data: "/set_dir_long" },
              { text: "🔴 فقط فروش (Short-Only)", callback_data: "/set_dir_short" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_dir_")) {
        const dir = data.replace("/set_dir_", "").toUpperCase();
        updateChatSettings(chatId, { directionPreference: dir as any });
        const dirLabel = dir === 'LONG' ? "🟢 فقط خرید (Long)" : dir === 'SHORT' ? "🔴 فقط فروش (Short)" : "↕️ دوطرفه هوشمند (Auto)";
        await sendMessage(chatId.toString(), `✅ فیلتر جهت معاملات پیش‌فرض روی **${dirLabel}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_horizon") {
        await sendMessage(chatId.toString(), `⏱️ **انتخاب افق زمانی پیش‌فرض معاملات (Time Horizon):**\n\nتارگت‌ها و فاصله حد ضرر متناسب با پوزیشن انتخابی تنظیم می‌شود:`, {
          inlineKeyboard: [
            [
              { text: "⚡ اسکلپ سریع (Scalp)", callback_data: "/set_hor_scalp" },
              { text: "⏱️ درون‌روز (Intraday)", callback_data: "/set_hor_intraday" },
              { text: "📅 سوینگ چند روزه (Swing)", callback_data: "/set_hor_swing" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_hor_")) {
        const hor = data.replace("/set_hor_", "");
        const mapped = hor === 'scalp' ? 'scalp_minutes' : hor === 'swing' ? 'swing_days' : 'intraday_hours';
        updateChatSettings(chatId, { timeHorizon: mapped as any });
        const label = hor === 'scalp' ? '⚡ اسکلپ (Scalp)' : hor === 'swing' ? '📅 سوینگ (Swing)' : '⏱️ درون‌روز (Intraday)';
        await sendMessage(chatId.toString(), `✅ افق زمانی پیش‌فرض با موفقیت روی **${label}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_tp_style") {
        await sendMessage(chatId.toString(), `🎯 **تنظیم استراتژی توزیع تارگت‌ها و سیو سود (TP Exit Style):**`, {
          inlineKeyboard: [
            [{ text: "🛡️ سریع و ایمن (سیو سود در TP1 و ریسک‌فری)", callback_data: "/set_tp_tight" }],
            [{ text: "⚖️ متعادل پله‌ای (۵۰٪ - ۳۰٪ - ۲۰٪ استاندارد)", callback_data: "/set_tp_balanced" }],
            [{ text: "🚀 دونده طولانی (مون‌بگ برای امواج TP3)", callback_data: "/set_tp_runner" }],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_tp_")) {
        const key = data.replace("/set_tp_", "");
        const val = key === 'tight' ? 'tight_safe' : key === 'runner' ? 'extended_runner' : 'balanced';
        updateChatSettings(chatId, { tpStyle: val as any });
        const label = val === 'tight_safe' ? "🛡️ سریع و ایمن" : val === 'extended_runner' ? "🚀 دونده طولانی" : "⚖️ متعادل پله‌ای";
        await sendMessage(chatId.toString(), `✅ سبک تارگت‌گذاری و سیو سود روی **${label}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_balance") {
        await sendMessage(chatId.toString(), `💵 **تنظیم موجودی حساب معاملاتی**\n\nبرای تنظیم سرمایه دلاری خود، لطفا دستور زیر را بنویسید و ارسال کنید:\n\n\`/set_balance [مقدار دلاری]\`\n\nمثال: \`/set_balance 2500\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_risk_percent") {
        await sendMessage(chatId.toString(), `⚖️ **تنظیم درصد ریسک هر معامله**\n\nبرای تنظیم درصد ریسک مجاز در هر پوزیشن، لطفا دستور زیر را ارسال کنید:\n\n\`/set_risk_percent [درصد]\`\n\nمثال: \`/set_risk_percent 1.5\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_leverage") {
        await sendMessage(chatId.toString(), `🚀 **تنظیم سقف اهرم معاملاتی (Max Leverage)**\n\nبرای تعیین سقف اهرم مجاز، لطفا دستور زیر را ارسال کنید:\n\n\`/set_leverage [مقدار اهرم]\`\n\nمثال: \`/set_leverage 15\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_min_rr") {
        await sendMessage(chatId.toString(), `💎 **تنظیم حداقل نسبت پاداش به ریسک (Min Risk:Reward)**\n\nبرای تنظیم حداقل R:R مورد انتظار در تحلیل‌ها، لطفا دستور زیر را ارسال کنید:\n\n\`/set_min_rr [عدد R:R]\`\n\nمثال: \`/set_min_rr 2.5\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_hunter") {
        const wl = settings.watchlist || [];
        const hunterHeader = `🔔 **تنظیمات شکارچی خودکار (Auto Pilot AI Hunter${botType === "bale" ? " - بله" : ""})**\n\n`;
        await sendMessage(chatId.toString(), hunterHeader +
          `• وضعیت فعلی: **${settings.autoHunterEnabled ? "✅ روشن" : "❌ خاموش"}**\n` +
          `• نمادهای تحت نظر (Watchlist):\n${wl.map(s => `▫️ #${s}`).join(" | ")}\n\n` +
          `شکارچی خودکار ارزهای شما را هر ۳ دقیقه اسکن کرده و ستاپ‌های گرید A+ را فوراً ارسال می‌کند.`, {
          inlineKeyboard: [
            [{ text: settings.autoHunterEnabled ? "🔴 خاموش کردن شکارچی" : "🟢 روشن کردن شکارچی", callback_data: "/toggle_hunter" }],
            [
              { text: "➕ افزودن به دیده‌بان", callback_data: "/hunter_add" },
              { text: "➖ حذف از دیده‌بان", callback_data: "/hunter_remove" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/toggle_hunter") {
        const newVal = !settings.autoHunterEnabled;
        updateChatSettings(chatId, { autoHunterEnabled: newVal });
        await sendMessage(chatId.toString(), `✅ وضعیت شکارچی خودکار با موفقیت به **${newVal ? "روشن 🟢" : "خاموش 🔴"}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/menu_hunter" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/hunter_add") {
        await sendMessage(chatId.toString(), `➕ **افزودن نماد به لیست شکارچی خودکار**\n\nلطفا دستور زیر را بفرستید:\n\n\`/add_watchlist [نام نماد]\`\n\nمثال: \`/add_watchlist SOLUSDT\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت", callback_data: "/menu_hunter" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/hunter_remove") {
        await sendMessage(chatId.toString(), `➖ **حذف نماد از لیست شکارچی خودکار**\n\nلطفا دستور زیر را بفرستید:\n\n\`/remove_watchlist [نام نماد]\`\n\nمثال: \`/remove_watchlist TSLA\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت", callback_data: "/menu_hunter" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/history_menu") {
        const historyList = (settings as any).history || [];
        const platformSuffix = botType === "bale" ? " (بله)" : "";
        if (historyList.length === 0) {
          await sendMessage(chatId.toString(), `📂 **ژورنال و تاریخچه معاملات اخیر${platformSuffix}**\n\nهنوز هیچ تحلیلی در این چت ذخیره نشده است. با تحلیل ارزها، ستاپ‌های معاملاتی شما در این بخش تاریخچه ثبت می‌شوند.`, {
            inlineKeyboard: [
              [{ text: "📊 تحلیل فوری ارزها", callback_data: "/scanner" }],
              [{ text: "🔙 منوی اصلی", callback_data: "/main_menu" }]
            ],
            replyKeyboard: mainReplyMenu,
          });
        } else {
          const historyText = historyList.map((h: any, idx: number) => {
            const dateStr = new Date(h.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
            const actionFa = h.action === 'LONG' ? '🟢 LONG' : h.action === 'SHORT' ? '🔴 SHORT' : '⏳ WAIT';
            return `${idx + 1}. **#${h.symbol}** (${actionFa} | Grade: ${h.grade})\n` +
                   `   • زمان ثبت: ${dateStr}\n` +
                   `   • ورود: $${h.optimalEntry.toLocaleString()} | استاپ: $${h.stopLoss.toLocaleString()}\n` +
                   `   • تارگت اول: $${h.tp1.toLocaleString()}`;
          }).join("\n\n----------------------------------------\n\n");

          await sendMessage(chatId.toString(), `📂 **ژورنال و تاریخچه ۵ تحلیل اخیر این چت${platformSuffix}**\n\n${historyText}`, {
            inlineKeyboard: [
              [{ text: "🧹 پاکسازی کامل ژورنال چت", callback_data: "/clear_journal" }],
              [{ text: "🔙 منوی اصلی ربات", callback_data: "/main_menu" }]
            ],
            replyKeyboard: mainReplyMenu,
          });
        }
        return;
      }

      if (data === "/clear_journal") {
        updateChatSettings(chatId, { history: [] } as any);
        await sendMessage(chatId.toString(), `✅ ژورنال و تاریخچه معاملات چت با موفقیت پاکسازی شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به ژورنال", callback_data: "/history_menu" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/watchlist_menu") {
        const wl = settings.watchlist || [];
        const platformSuffix = botType === "bale" ? " (بله)" : "";
        await sendMessage(chatId.toString(), `🔍 **واچ‌لیست دارایی‌های تحت نظر شکارچی${platformSuffix}** 🔍\n\nتعداد **${wl.length}** نماد در واچ‌لیست شما فعال است:\n\n${wl.map(s => `▫️ #${s}`).join(" | ")}\n\nجهت مدیریت نمادها، از دکمه‌های زیر استفاده کنید:`, {
          inlineKeyboard: [
            [
              { text: "➕ افزودن به واچ‌لیست", callback_data: "/hunter_add" },
              { text: "➖ حذف از واچ‌لیست", callback_data: "/hunter_remove" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/calc_setup")) {
        const parts = data.replace("/calc_setup", "").trim().split(" ");
        const symbol = parts[0] || "BTCUSDT";
        const entry = parseFloat(parts[1]) || 0;
        const sl = parseFloat(parts[2]) || 0;
        if (entry === 0 || sl === 0) {
          await sendMessage(chatId.toString(), `❌ پارامترهای ستاپ یافت نشد.`, { replyKeyboard: mainReplyMenu });
        } else {
          const calcText = performPositionCalculation(settings.balance, settings.riskPercent, entry, sl, symbol);
          await sendMessage(chatId.toString(), calcText, {
            inlineKeyboard: [[{ text: "📊 دریافت مجدد ستاپ", callback_data: `/analyze ${symbol}` }]],
            replyKeyboard: mainReplyMenu,
          });
        }
        return;
      }
    }

    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text.trim();
    const settings = getChatSettings(chatId);

    if (text.startsWith("/set_balance")) {
      const val = parseFloat(text.replace("/set_balance", "").trim());
      if (isNaN(val) || val <= 0) {
        await sendMessage(chatId.toString(), `❌ موجودی نامعتبر است. فرمت صحیح:\n\`/set_balance 1500\``, { replyKeyboard: mainReplyMenu });
      } else {
        updateChatSettings(chatId, { balance: val });
        await sendMessage(chatId.toString(), `✅ موجودی حساب شما با موفقیت روی **$${val.toLocaleString()}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
      }
      return;
    }

    if (text.startsWith("/set_risk_percent")) {
      const val = parseFloat(text.replace("/set_risk_percent", "").trim());
      if (isNaN(val) || val <= 0 || val > 100) {
        await sendMessage(chatId.toString(), `❌ درصد ریسک نامعتبر است. فرمت صحیح:\n\`/set_risk_percent 2\``, { replyKeyboard: mainReplyMenu });
      } else {
        updateChatSettings(chatId, { riskPercent: val });
        await sendMessage(chatId.toString(), `✅ درصد ریسک معاملات شما روی **${val}%** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
      }
      return;
    }

    if (text.startsWith("/set_leverage")) {
      const val = parseInt(text.replace("/set_leverage", "").trim());
      if (isNaN(val) || val < 1 || val > 125) {
        await sendMessage(chatId.toString(), `❌ اهرم وارد شده نامعتبر است (بین ۱ تا ۱۲۵ مجاز است). فرمت صحیح:\n\`/set_leverage 10\``, { replyKeyboard: mainReplyMenu });
      } else {
        updateChatSettings(chatId, { leverage: val });
        await sendMessage(chatId.toString(), `✅ سقف اهرم معاملاتی پیشنهادی پوزیشن‌ها با موفقیت روی **${val}x** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
      }
      return;
    }

    if (text.startsWith("/set_min_rr")) {
      const val = parseFloat(text.replace("/set_min_rr", "").trim());
      if (isNaN(val) || val < 1.0 || val > 10.0) {
        await sendMessage(chatId.toString(), `❌ نسبت R:R وارد شده نامعتبر است (بین ۱.۰ تا ۱۰.۰ مجاز است). فرمت صحیح:\n\`/set_min_rr 2.5\``, { replyKeyboard: mainReplyMenu });
      } else {
        updateChatSettings(chatId, { minRRRatio: val });
        await sendMessage(chatId.toString(), `✅ حداقل نسبت پاداش به ریسک (R:R) ستاپ‌ها روی **1:${val}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
      }
      return;
    }

    if (text.startsWith("/add_watchlist")) {
      const symbol = text.replace("/add_watchlist", "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!symbol) {
        await sendMessage(chatId.toString(), `❌ نام نماد خالی است.`, { replyKeyboard: mainReplyMenu });
      } else {
        const wl = settings.watchlist || [];
        if (wl.includes(symbol)) {
          await sendMessage(chatId.toString(), `⚠️ نماد #${symbol} از قبل در دیده‌بان شما موجود است.`, { replyKeyboard: mainReplyMenu });
        } else {
          updateChatSettings(chatId, { watchlist: [...wl, symbol] });
          await sendMessage(chatId.toString(), `✅ نماد **#${symbol}** به دیده‌بان شکارچی خودکار شما افزوده شد.`, {
            inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/watchlist_menu" }]],
            replyKeyboard: mainReplyMenu,
          });
        }
      }
      return;
    }

    if (text.startsWith("/remove_watchlist")) {
      const symbol = text.replace("/remove_watchlist", "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!symbol) {
        await sendMessage(chatId.toString(), `❌ نام نماد خالی است.`, { replyKeyboard: mainReplyMenu });
      } else {
        const wl = settings.watchlist || [];
        if (!wl.includes(symbol)) {
          await sendMessage(chatId.toString(), `⚠️ نماد #${symbol} در دیده‌بان شما یافت نشد.`, { replyKeyboard: mainReplyMenu });
        } else {
          updateChatSettings(chatId, { watchlist: wl.filter(s => s !== symbol) });
          await sendMessage(chatId.toString(), `✅ نماد **#${symbol}** از دیده‌بان شکارچی خودکار شما حذف شد.`, {
            inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/watchlist_menu" }]],
            replyKeyboard: mainReplyMenu,
          });
        }
      }
      return;
    }

    if (text.startsWith("/calc")) {
      const rawArgs = text.replace("/calc", "").trim();
      const parts = rawArgs.split(/\s+/);
      const platformSuffix = botType === "bale" ? " (بله)" : "";
      if (!rawArgs) {
        const calcMsg = `🧮 **ماشین‌حساب هوشمند مدیریت سرمایه و مارجین${platformSuffix}**\n\nبرای محاسبه دقیق حجم ورود:\nدستور را به شکل زیر بفرستید:\n\n\`/calc [سرمایه] [درصد ریسک] [قیمت ورود] [استاپ‌لاس]\`\n\nمثال: \`/calc 1000 2 68000 66500\`\n\nیا ستاپ اختصاصی با جزییات ذخیره شده:\n\`/calc [نماد] [قیمت ورود] [استاپ‌لاس]\`\nمثال: \`/calc BTCUSDT 95400 94100\``;
        await sendMessage(chatId.toString(), calcMsg, {
          inlineKeyboard: [[{ text: "📊 محاسبه BTC پیش‌فرض", callback_data: "/calc_setup BTCUSDT 96000 94500" }]],
          replyKeyboard: mainReplyMenu,
        });
      } else if (parts.length === 4) {
        const bal = parseFloat(parts[0]);
        const risk = parseFloat(parts[1]);
        const entry = parseFloat(parts[2]);
        const sl = parseFloat(parts[3]);
        if (isNaN(bal) || isNaN(risk) || isNaN(entry) || isNaN(sl)) {
          await sendMessage(chatId.toString(), `❌ پارامترها نامعتبر هستند.`, { replyKeyboard: mainReplyMenu });
        } else {
          const resText = performPositionCalculation(bal, risk, entry, sl, "CUSTOM");
          await sendMessage(chatId.toString(), resText, { replyKeyboard: mainReplyMenu });
        }
      } else if (parts.length === 3) {
        const sym = parts[0].toUpperCase();
        const entry = parseFloat(parts[1]);
        const sl = parseFloat(parts[2]);
        if (isNaN(entry) || isNaN(sl)) {
          await sendMessage(chatId.toString(), `❌ قیمت‌های وارد شده نامعتبر هستند.`, { replyKeyboard: mainReplyMenu });
        } else {
          const resText = performPositionCalculation(settings.balance, settings.riskPercent, entry, sl, sym);
          await sendMessage(chatId.toString(), resText, { replyKeyboard: mainReplyMenu });
        }
      } else {
        await sendMessage(chatId.toString(), `❌ فرمت دستور نادرست است.`, { replyKeyboard: mainReplyMenu });
      }
      return;
    }

    if (text === "/start" || text === "شروع" || text === "سلام" || text === "/main_menu") {
      const platformSuffix = botType === "bale" ? " (بله)" : "";
      const welcome = `👋 **سلام! به بات تریدینگ‌ویو، تحلیل تکنیکال و سیگنال‌های دوگانه (هوش مصنوعی + دانش آفلاین) خوش آمدید${platformSuffix}.**

سیستم دارای دو موتور تولید ستاپ معاملاتی است:
🧠 **۱. هوش مصنوعی آنلاین:** تحلیل بلادرنگ و مولتی‌مدال پرایس اکشن
📚 **۲. دانش و استراتژی آفلاین:** الگوریتم قوانین ثابت اسمارت‌مانی (SMC)، اردربلاک، هانت نقدینگی و فیبوناچی

امکانات پنل به صورت **دکمه‌های شیشه‌ای** و **منوی زیر چت** در دسترس است:`;
      await sendMessage(chatId.toString(), welcome, {
        inlineKeyboard: [
          [
            { text: "🧠 تحلیل زنده BTC (هوش مصنوعی)", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" },
            { text: "📚 ستاپ BTC (دانش آفلاین SMC)", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" },
          ],
          [
            { text: "🧠 تحلیل ETH", callback_data: "/analyze ETHUSDT 15m ONLINE_AI" },
            { text: "🧠 تحلیل SOL", callback_data: "/analyze SOLUSDT 15m ONLINE_AI" },
          ],
          [
            { text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" },
            { text: "⚙️ تنظیمات ریسک و سود", callback_data: "/settings_risk" },
          ],
          [
            { text: "🔔 شکار خودکار فرصت‌ها", callback_data: "/menu_hunter" },
            { text: "🧮 محاسبه‌گر حجم", callback_data: "/calc" },
          ],
          [
            { text: "📂 تاریخچه و ژورنال چت", callback_data: "/history_menu" },
            { text: "🔍 مشاهده واچ‌لیست دیده‌بان", callback_data: "/watchlist_menu" }
          ],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "🧠 تحلیل هوش مصنوعی") {
      await sendMessage(chatId.toString(), "🧠 **تحلیل با هوش مصنوعی آنلاین (Gemini AI):**\nیک دارایی را انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m ONLINE_AI" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m ONLINE_AI" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h ONLINE_AI" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "📚 دانش و استراتژی آفلاین" || text === "📚 استراتژی آفلاین SMC") {
      const label = botType === "bale" ? "SMC Rules" : "SMC";
      await sendMessage(chatId.toString(), `📚 **تحلیل با متدولوژی و دانش آفلاین (Smart Money Concepts & ${label}):**\nدارایی مورد نظر را انتخاب کنید:`, {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m OFFLINE_RULES" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m OFFLINE_RULES" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h OFFLINE_RULES" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "📊 تحلیل فوری ارزها") {
      await sendMessage(chatId.toString(), "🔍 ارز یا دارایی مورد نظرتان را انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h" }],
          [{ text: "🟢 سهام انویدیا (NVDA)", callback_data: "/analyze NVDA 1h" }, { text: "🐕 دوج‌کوین (DOGE)", callback_data: "/analyze DOGEUSDT 15m" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "🎯 اسکنر هوشمند بازار") {
      await runAction(chatId, "/scanner");
    } else if (text === "⚙️ تنظیمات ریسک و سود") {
      await runAction(chatId, "/settings_risk");
    } else if (text === "🧮 محاسبه حجم و مارجین") {
      await runCommand(chatId, "/calc");
    } else if (text === "🔔 شکار خودکار فرصت‌ها") {
      await runAction(chatId, "/menu_hunter");
    } else if (text === "🔍 واچ‌لیست دیده‌بان") {
      await runAction(chatId, "/watchlist_menu");
    } else if (text === "📂 تاریخچه و ژورنال") {
      await runAction(chatId, "/history_menu");
    } else if (text === "⚖️ قوانین و سلب مسئولیت حقوقی") {
      await sendMessage(chatId.toString(), legalRulesMessage, {
        inlineKeyboard: [
          [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
          [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else {
      const parts = text.split(/\s+/);
      const symbol = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
      const tf = parts[1] || settings.timeframe;
      const mode = (parts[2] === "OFFLINE" || parts[2] === "SMC") ? "OFFLINE_RULES" : settings.engineMode;

      try {
        const marketData = await fetchLiveMarketData(symbol);
        const setup = await generateAITradingAnalysis({
          symbol,
          timeframe: tf,
          engineMode: mode,
          timeHorizon: settings.timeHorizon,
          strategy: settings.strategy,
          actionPreference: settings.directionPreference,
          riskSettings: {
            profile: settings.riskProfile,
            maxRiskPercent: settings.riskPercent,
            maxLeverage: settings.leverage,
            minRRRatio: settings.minRRRatio,
            tpStyle: settings.tpStyle,
          }
        }, marketData);

        saveToHistory(chatId, setup);

        const setupMsg = botType === "telegram" ? setup.telegramMessage : setup.baleMessage;

        await sendMessage(chatId.toString(), setupMsg, {
          inlineKeyboard: [
            [
              { text: `🧠 بررسی با هوش مصنوعی`, callback_data: `/analyze ${symbol} ${tf} ONLINE_AI` },
              { text: `📚 بررسی با دانش آفلاین (SMC)`, callback_data: `/analyze ${symbol} ${tf} OFFLINE_RULES` },
            ],
            [
              { text: "🧮 محاسبه حجم", callback_data: `/calc_setup ${symbol} ${setup.optimalEntry} ${setup.stopLoss.price}` },
              { text: "🎯 اسکنر بازار", callback_data: "/scanner" },
            ],
          ],
          replyKeyboard: mainReplyMenu,
        });
      } catch (err) {
        await sendMessage(chatId.toString(), `❌ نماد یا دارایی **"${symbol}"** یافت نشد یا در پردازش آن خطایی رخ داد.`, { replyKeyboard: mainReplyMenu });
      }
    }
  } catch (err) {
    console.error(`Unified bot handler error [${botType}]:`, err);
  }
}
