// Use native global fetch instead of uninstalled node-fetch
import { POPULAR_MARKETS, fetchLiveMarketData, parseBaseAndQuote, normalizeSymbol } from "./market.js";
import { generateAITradingAnalysis } from "./gemini.js";
import { sendTelegramMessage, sendBaleMessage } from "./bots.js";
import { getChatSettings, updateChatSettings, getGlobalConfig, updateGlobalConfig, isAdmin, authenticateAdmin, deauthenticateAdmin, getAllActiveChatsCount, settingsStore } from "./botSettingsStore.js";
import { scanAuthenticMarketOpportunities } from "./offlineKnowledgeEngine.js";

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

async function showQuoteSelectionMenu(
  chatId: number,
  baseSymbol: string,
  botType: "telegram" | "bale",
  token: string,
  settings: any,
  mainReplyMenu: any
) {
  const sendMessage = async (txt: string, opts?: any) => {
    if (botType === "telegram") {
      return sendTelegramMessage(token, chatId.toString(), txt, opts);
    } else {
      return sendBaleMessage(token, chatId.toString(), txt, opts);
    }
  };

  const cleanBase = baseSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const quoteMsg = `💎 **انتخاب واحد معاملاتی برای نماد #${cleanBase}** 💎\n\n` +
    `لطفاً واحد یا جفت‌ارز مورد نظر خود را جهت استخراج تحلیل و ستاپ تریدینگ‌ویو انتخاب کنید:\n\n` +
    `• **USDT**: تتر (دلار دیجیتال)\n` +
    `• **USD**: دلار فیات جهانی\n` +
    `• **BTC**: جفت‌ارز بیت‌کوین (ساتوشی)\n` +
    `• **IRT**: تومان / ریال ایران\n` +
    `• **EUR**: یورو اروپا\n` +
    `یا روی **«✏️ تایپ واحد دلخواه»** بزنید تا هر واحد دلخواه دیگر (USDC، DAI و ...) را دستی وارد نمایید.`;

  await sendMessage(quoteMsg, {
    inlineKeyboard: [
      [
        { text: `💵 USDT (تتر)`, callback_data: `/quote_select ${cleanBase} USDT`, style: "success" },
        { text: `💲 USD (دلار)`, callback_data: `/quote_select ${cleanBase} USD`, style: "primary" },
      ],
      [
        { text: `🪙 BTC (ساتوشی)`, callback_data: `/quote_select ${cleanBase} BTC`, style: "primary" },
        { text: `🇮🇷 IRT (تومان)`, callback_data: `/quote_select ${cleanBase} IRT`, style: "primary" },
      ],
      [
        { text: `💶 EUR (یورو)`, callback_data: `/quote_select ${cleanBase} EUR`, style: "primary" },
        { text: `✏️ تایپ واحد دلخواه`, callback_data: `/prompt_quote ${cleanBase}`, style: "primary" },
      ],
      [
        { text: `⚡ تحلیل فوری با پیش‌فرض (${cleanBase}USDT)`, callback_data: `/analyze ${cleanBase}USDT`, style: "success" }
      ],
      [
        { text: `🔙 منوی اصلی ربات`, callback_data: `/main_menu` }
      ]
    ],
    replyKeyboard: mainReplyMenu,
  });
}

async function renderAdminAuthPrompt(
  chatId: number,
  botType: "telegram" | "bale",
  token: string,
  mainReplyMenu: any
) {
  const sendMessage = async (txt: string, opts?: any) => {
    if (botType === "telegram") {
      return sendTelegramMessage(token, chatId.toString(), txt, opts);
    } else {
      return sendBaleMessage(token, chatId.toString(), txt, opts);
    }
  };

  updateChatSettings(chatId, { pendingAdminPasscode: true, pendingCustomQuoteBase: undefined });

  const text = `🔒 **ورود به پنل مدیریت ارشد ربات (Admin Authentication)** 🔒\n\n` +
    `این بخش اختصاصی مدیریت سیستم بوده و دسترسی به آن نیازمند تایید هویت و رمز عبور ادمین است.\n\n` +
    `✍️ **لطفاً رمز عبور ادمین را همین حالا ارسال کنید:**\n` +
    `_(رمز پیش‌فرض سیستم: \`admin123\` است که در بخش تنظیمات قابل تغییر می‌باشد)_`;

  await sendMessage(text, {
    inlineKeyboard: [
      [{ text: "🔑 ورود سریع با رمز پیش‌فرض (admin123)", callback_data: "/admin_auth admin123", style: "success" }],
      [{ text: "🔙 انصراف و بازگشت به منوی اصلی", callback_data: "/main_menu" }]
    ],
    replyKeyboard: mainReplyMenu,
  });
}

async function renderAdminDashboard(
  chatId: number,
  botType: "telegram" | "bale",
  token: string,
  mainReplyMenu: any
) {
  const sendMessage = async (txt: string, opts?: any) => {
    if (botType === "telegram") {
      return sendTelegramMessage(token, chatId.toString(), txt, opts);
    } else {
      return sendBaleMessage(token, chatId.toString(), txt, opts);
    }
  };

  const cfg = getGlobalConfig();
  const isAi = cfg.enableAiEngine !== false;
  const isOffline = cfg.enableOfflineEngine !== false;
  const defEngine = cfg.defaultEngineMode === "OFFLINE_RULES" ? "📚 آفلاین SMC" : "🧠 هوش مصنوعی";
  const isHunter = cfg.autoHunter?.enabled === true;
  const hunterInterval = cfg.autoHunter?.intervalMinutes || 3;
  const tgBc = cfg.autoHunter?.autoBroadcastToTelegram === true;
  const baleBc = cfg.autoHunter?.autoBroadcastToBale === true;
  const riskProf = cfg.riskSettings?.profile || "moderate";
  const riskProfFa = riskProf === 'conservative' ? '🛡️ کم‌ریسک' : riskProf === 'aggressive' ? '🚀 تهاجمی' : '⚖️ متعادل';
  const defTf = cfg.defaultTimeframe || "15m";
  const totalUsers = getAllActiveChatsCount();

  const text = `👑 **پنل مدیریت ارشد و تنظیمات سراسری ربات تریدینگ‌ویو** 👑\n\n` +
    `🔐 **وضعیت دسترسی:** ✅ احراز هویت ادمین فعال\n` +
    `👥 **تعداد کاربران/چت‌های ثبت‌شده:** **${totalUsers} کاربر فعال**\n\n` +
    `📊 **وضعیت لحظه‌ای موتورها و ابزارهای ربات:**\n` +
    `• 🧠 موتور هوش مصنوعی آنلاین: **${isAi ? "🟢 فعال" : "🔴 غیرفعال / خاموش"}**\n` +
    `• 📚 موتور استراتژی آفلاین SMC: **${isOffline ? "🟢 فعال" : "🔴 غیرفعال / خاموش"}**\n` +
    `• ⚡ موتور پیش‌فرض سراسری: **${defEngine}**\n` +
    `• 🔔 شکارچی خودکار (Auto-Pilot): **${isHunter ? "🟢 فعال" : "🔴 غیرفعال"}** (هر ${hunterInterval} دقیقه)\n` +
    `• 📡 ارسال شکارچی به تلگرام: **${tgBc ? "🟢 روشن" : "🔴 خاموش"}**\n` +
    `• 📡 ارسال شکارچی به بله: **${baleBc ? "🟢 روشن" : "🔴 خاموش"}**\n` +
    `• 🛡️ پروفایل ریسک پیش‌فرض سیستم: **${riskProfFa}**\n` +
    `• ⏱️ تایم‌فریم پیش‌فرض سیستم: **${defTf}**\n\n` +
    `👇 **با کلیک روی دکمه‌های شیشه‌ای رنگی زیر، هر گزینه را فوراً تغییر دهید:**`;

  const inlineKeyboard = [
    [
      { text: `🧠 موتور هوش مصنوعی: ${isAi ? "🟢 فعال" : "🔴 خاموش"}`, callback_data: "/admin_toggle_ai", style: isAi ? "success" : "danger" },
      { text: `📚 دانش آفلاین SMC: ${isOffline ? "🟢 فعال" : "🔴 خاموش"}`, callback_data: "/admin_toggle_offline", style: isOffline ? "success" : "danger" },
    ],
    [
      { text: `⚡ موتور پیش‌فرض: ${defEngine}`, callback_data: "/admin_toggle_def_engine", style: "primary" },
      { text: `🔔 شکارچی خودکار: ${isHunter ? "🟢 روشن" : "🔴 خاموش"}`, callback_data: "/admin_toggle_hunter", style: isHunter ? "success" : "danger" },
    ],
    [
      { text: `⏱️ بازه ارسال شکارچی (${hunterInterval} دقیقه)`, callback_data: "/admin_interval_menu", style: "primary" },
      { text: `📡 ارسال تلگرام: ${tgBc ? "🟢 روشن" : "🔴 خاموش"}`, callback_data: "/admin_toggle_tg_bc", style: tgBc ? "success" : "danger" },
    ],
    [
      { text: `📡 ارسال بله: ${baleBc ? "🟢 روشن" : "🔴 خاموش"}`, callback_data: "/admin_toggle_bale_bc", style: baleBc ? "success" : "danger" },
      { text: `🛡️ پروفایل ریسک سیستم (${riskProfFa})`, callback_data: "/admin_risk_menu", style: "warning" },
    ],
    [
      { text: `⏱️ تایم‌فریم پیش‌فرض سیستم (${defTf})`, callback_data: "/admin_tf_menu", style: "primary" },
      { text: `📢 ارسال پیام همگانی (Broadcast)`, callback_data: "/admin_prompt_broadcast", style: "warning" },
    ],
    [
      { text: `🔑 تغییر رمز عبور ادمین`, callback_data: "/admin_prompt_chpass", style: "primary" },
      { text: `🚪 خروج از حالت ادمین`, callback_data: "/admin_logout", style: "danger" },
    ],
    [
      { text: `🔄 به‌روزرسانی پنل ادمین`, callback_data: "/admin" },
      { text: `🔙 بازگشت به منوی کاربری`, callback_data: "/main_menu" }
    ]
  ];

  await sendMessage(text, {
    inlineKeyboard,
    replyKeyboard: mainReplyMenu,
  });
}

async function handleSymbolSearch(
  chatId: number,
  rawInput: string,
  botType: "telegram" | "bale",
  token: string,
  settings: any,
  mainReplyMenu: any
) {
  const sendMessage = async (txt: string, opts?: any) => {
    if (botType === "telegram") {
      return sendTelegramMessage(token, chatId.toString(), txt, opts);
    } else {
      return sendBaleMessage(token, chatId.toString(), txt, opts);
    }
  };

  const clean = rawInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { base, quote } = parseBaseAndQuote(clean);

  // If the user typed only the base asset name (e.g. BTC, XRP, SOL, DOGE, ETH, ADA) without a full pair, show unit picker first!
  const isBaseOnly = clean === base && !['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'NVDA', 'TSLA', 'AAPL', 'MSFT'].includes(clean);
  if (isBaseOnly && clean.length <= 6) {
    return showQuoteSelectionMenu(chatId, clean, botType, token, settings, mainReplyMenu);
  }

  const symbol = clean;

  try {
    const loadingText = `⏳ **در حال دریافت داده‌های زنده و تحلیل ستاپ هوشمند ورود/خروج برای #${symbol}...**\n\nلطفا چند ثانیه منتظر بمانید تا الگوهای پرایس اکشن و سطوح نقدینگی استخراج شوند.`;
    await sendMessage(loadingText, { replyKeyboard: mainReplyMenu });
    
    // Fetch live market data
    const globalCfg = getGlobalConfig();
    const isAiOn = globalCfg.enableAiEngine !== false;
    const isOfflineOn = globalCfg.enableOfflineEngine !== false;
    
    let activeEngine = settings.engineMode || globalCfg.defaultEngineMode || "ONLINE_AI";
    if (activeEngine === "ONLINE_AI" && !isAiOn) activeEngine = "OFFLINE_RULES";
    if (activeEngine === "OFFLINE_RULES" && !isOfflineOn) activeEngine = "ONLINE_AI";

    const marketData = await fetchLiveMarketData(symbol, settings.timeframe || "15m");
    
    // Generate full trading setup with Entry, SL, TPs
    const setup = await generateAITradingAnalysis({
      symbol,
      timeframe: settings.timeframe || "15m",
      engineMode: activeEngine as any,
      timeHorizon: settings.timeHorizon || "intraday_hours",
      strategy: settings.strategy || "SMC & Price Action",
      actionPreference: settings.directionPreference || "AUTO",
      riskSettings: {
        profile: settings.riskProfile || "moderate",
        maxRiskPercent: settings.riskPercent || 2.0,
        maxLeverage: settings.leverage || 15,
        minRRRatio: settings.minRRRatio || 2.5,
        tpStyle: settings.tpStyle || "balanced",
      }
    }, marketData);

    // Save to history
    saveToHistory(chatId, setup);

    const setupMsg = botType === "telegram" ? setup.telegramMessage : setup.baleMessage;
    const wl = settings.watchlist || [];
    const isInWatchlist = wl.includes(symbol);

    const searchEngineRow: any[] = [];
    if (isAiOn && isOfflineOn) {
      searchEngineRow.push({ text: `🧠 هوش مصنوعی زنده`, callback_data: `/analyze ${symbol} ${settings.timeframe || "15m"} ONLINE_AI` });
      searchEngineRow.push({ text: `📚 ستاپ آفلاین SMC`, callback_data: `/analyze ${symbol} ${settings.timeframe || "15m"} OFFLINE_RULES` });
    } else if (isAiOn) {
      searchEngineRow.push({ text: `🔄 تحلیل مجدد با هوش مصنوعی`, callback_data: `/analyze ${symbol} ${settings.timeframe || "15m"} ONLINE_AI` });
    } else {
      searchEngineRow.push({ text: `🔄 تحلیل مجدد با دانش آفلاین SMC`, callback_data: `/analyze ${symbol} ${settings.timeframe || "15m"} OFFLINE_RULES` });
    }

    const inlineKeyboard = [
      [
        { text: `💱 انتخاب واحد دیگر (Quote)`, callback_data: `/quote_menu ${base}` },
        isInWatchlist 
          ? { text: `➖ حذف از دیده‌بان`, callback_data: `/remove_wl_confirm ${symbol}` }
          : { text: `➕ افزودن به دیده‌بان`, callback_data: `/add_wl_confirm ${symbol}` }
      ],
      [
        { text: `🧮 محاسبه حجم معامله (Position)`, callback_data: `/calc_setup ${symbol} ${setup.optimalEntry} ${setup.stopLoss.price}` }
      ],
      searchEngineRow,
      [
        { text: `🔍 جستجوی نماد جدید`, callback_data: `/search_prompt` },
        { text: `🔙 منوی اصلی ربات`, callback_data: `/main_menu` }
      ]
    ];

    await sendMessage(setupMsg, {
      inlineKeyboard,
      replyKeyboard: mainReplyMenu,
    });
  } catch (err) {
    console.error("Symbol search analysis error:", err);
    const errorMsg = `❌ نماد یا دارایی **"${symbol}"** در بازارهای تریدینگ‌ویو یافت نشد یا در پردازش آن خطایی رخ داد.\n\nلطفا نام نماد را به درستی وارد کنید. نمونه‌ها:\n• کریپتو: \`BTCUSDT\`\n• فارکس: \`EURUSD\`\n• طلا: \`XAUUSD\`\n• سهام: \`NVDA\``;
    await sendMessage(errorMsg, {
      inlineKeyboard: [
        [{ text: "🔍 تلاش مجدد (جستجو)", callback_data: "/search_prompt" }],
        [{ text: "🔙 منوی اصلی", callback_data: "/main_menu" }]
      ],
      replyKeyboard: mainReplyMenu
    });
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

    const globalConfig = getGlobalConfig();
    const enableAi = globalConfig.enableAiEngine !== false;
    const enableOffline = globalConfig.enableOfflineEngine !== false;

    const engineButtonsRow: { text: string }[] = [];
    if (enableAi) engineButtonsRow.push({ text: "🧠 تحلیل هوش مصنوعی" });
    if (enableOffline) engineButtonsRow.push({ text: "📚 استراتژی آفلاین SMC" });
    if (engineButtonsRow.length === 0) {
      engineButtonsRow.push({ text: "📚 استراتژی آفلاین SMC" });
    }

    const mainReplyMenu = [
      [{ text: "📊 تحلیل فوری ارزها" }, { text: "🎯 اسکنر هوشمند بازار" }],
      engineButtonsRow,
      [{ text: "⚙️ تنظیمات ریسک و سود" }, { text: "🧮 محاسبه حجم و مارجین" }],
      [{ text: "🔍 واچ‌لیست دیده‌بان" }, { text: "📂 تاریخچه و ژورنال" }],
      [{ text: "👑 پنل مدیریت ادمین" }, { text: "⚖️ قوانین و سلب مسئولیت حقوقی" }],
    ];

    if (callbackQuery) {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      const settings = getChatSettings(chatId);

      if (data === "/accept_terms" || data === "/accept_rules") {
        updateChatSettings(chatId, { termsAccepted: true, termsAcceptedAt: Date.now() });
        await sendMessage(chatId.toString(), `✅ **قوانین و شرایط سلب مسئولیت حقوقی با موفقیت تایید شد.**\n\n🎉 دسترسی شما به تمامی امکانات، ستاپ‌های هوش مصنوعی آنلاین، استراتژی آفلاین و ابزارهای تریدینگ‌ویو فعال گردید.`, {
          replyKeyboard: mainReplyMenu,
        });
        // Immediately present main menu
        return runAction(chatId, "/main_menu");
      }

      if (data === "/rules" || data === "/disclaimer") {
        const inlineKeyboard = !settings.termsAccepted
          ? [
              [{ text: "✅ موافق قوانین هستم و می‌پذیرم", callback_data: "/accept_terms", style: "success" }],
            ]
          : [
              [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
              [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }],
            ];

        await sendMessage(chatId.toString(), legalRulesMessage, {
          inlineKeyboard,
          replyKeyboard: settings.termsAccepted ? mainReplyMenu : undefined,
        });
        return;
      }

      // If user hasn't accepted terms yet, prevent other actions and show disclaimer prompt
      if (!settings.termsAccepted) {
        await sendMessage(chatId.toString(), `⚠️ **کاربر گرامی، برای ورود و استفاده از امکانات ربات، ابتدا باید قوانین و سلب مسئولیت حقوقی را مطالعه و تأیید نمایید.**`, {
          inlineKeyboard: [
            [{ text: "✅ موافق قوانین هستم و می‌پذیرم", callback_data: "/accept_terms", style: "success" }],
            [{ text: "⚖️ مطالعه متن کامل قوانین", callback_data: "/rules", style: "primary" }],
          ],
        });
        return;
      }

      if (data === "/main_menu") {
        const platformSuffix = botType === "bale" ? " (بله)" : "";
        const welcome = `👋 **سلام! به بات تریدینگ‌ویو، تحلیل تکنیکال و سیگنال‌های دوگانه (هوش مصنوعی + دانش آفلاین) خوش آمدید${platformSuffix}.**

سیستم دارای دو موتور تولید ستاپ معاملاتی است:
${enableAi ? "🧠 **۱. هوش مصنوعی آنلاین:** تحلیل بلادرنگ و مولتی‌مدال پرایس اکشن (فعال)\n" : "🧠 **۱. هوش مصنوعی آنلاین:** (غیرفعال توسط مدیر)\n"}${enableOffline ? "📚 **۲. دانش و استراتژی آفلاین:** الگوریتم قوانین ثابت اسمارت‌مانی SMC (فعال)" : "📚 **۲. دانش و استراتژی آفلاین:** (غیرفعال توسط مدیر)"}

امکانات پنل به صورت **دکمه‌های شیشه‌ای با استایل رنگی** و **منوی زیر چت** در دسترس است:`;

        const engineRows: any[] = [];
        if (enableAi && enableOffline) {
          engineRows.push([{ text: "🧠 𝖮𝖭𝖫𝖨𝖭𝖤 | 🟡 تحلیل هوش مصنوعی BTC", callback_data: "/analyze BTCUSDT 15m ONLINE_AI", style: "success" }]);
          engineRows.push([{ text: "📚 𝖮𝖥𝖥𝖫𝖨𝖭𝖤 | 🟡 ستاپ آفلاین SMC BTC", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES", style: "primary" }]);
        } else if (enableAi) {
          engineRows.push([{ text: "🧠 𝖮𝖭𝖫𝖨𝖭𝖤 | 🟡 تحلیل هوش مصنوعی BTC", callback_data: "/analyze BTCUSDT 15m ONLINE_AI", style: "success" }]);
        } else {
          engineRows.push([{ text: "📚 𝖮𝖥𝖥𝖫𝖨𝖭𝖤 | 🟡 ستاپ آفلاین SMC BTC", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES", style: "primary" }]);
        }

        await sendMessage(chatId.toString(), welcome, {
          inlineKeyboard: [
            ...engineRows,
            [
              { text: "🔵 تحلیل زنده ETH", callback_data: `/analyze ETHUSDT 15m ${enableAi ? 'ONLINE_AI' : 'OFFLINE_RULES'}`, style: "success" },
              { text: "🟣 تحلیل زنده SOL", callback_data: `/analyze SOLUSDT 15m ${enableAi ? 'ONLINE_AI' : 'OFFLINE_RULES'}`, style: "success" },
            ],
            [
              { text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner", style: "success" },
              { text: "⚙️ تنظیمات کاربری و ریسک", callback_data: "/settings_risk", style: "primary" },
            ],
            [
              { text: "🔔 شکارچی خودکار (Hunter)", callback_data: "/menu_hunter", style: "primary" },
              { text: "🧮 محاسبه حجم معامله (Calc)", callback_data: "/calc", style: "primary" },
            ],
            [
              { text: "📂 ژورنال معاملات چت", callback_data: "/history_menu", style: "primary" },
              { text: "🔍 مدیریت واچ‌لیست دیده‌بان", callback_data: "/watchlist_menu", style: "primary" }
            ],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/search_prompt") {
        await sendMessage(chatId.toString(), `🔍 **بخش جستجوی پیشرفته و افزودن دارایی خاص**\n\nبرای جستجوی زنده چارت، بررسی اندیکاتورها و افزودن نماد جدید به واچ‌لیست خود، نام نماد (ارزدیجیتال، فارکس یا سهام) را تایپ کرده و بفرستید.\n\n👉 **فرمت‌های نمونه:**\n• ارز دیجیتال: \`BTCUSDT\` یا \`SOLUSDT\`\n• جفت‌ارز فارکس: \`EURUSD\` یا \`GBPUSD\`\n• اونس جهانی طلا: \`XAUUSD\`\n• سهام بین‌المللی: \`NVDA\` یا \`TSLA\`\n\nهمچنین می‌توانید از دستور زیر استفاده کنید:\n\`/search [نام نماد]\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به واچ‌لیست", callback_data: "/watchlist_menu" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/add_wl_confirm")) {
        const symbol = data.replace("/add_wl_confirm", "").trim().toUpperCase();
        const wl = settings.watchlist || [];
        if (!wl.includes(symbol)) {
          updateChatSettings(chatId, { watchlist: [...wl, symbol] });
        }
        await sendMessage(chatId.toString(), `✅ نماد **#${symbol}** با موفقیت به واچ‌لیست دیده‌بان شما اضافه شد.`, {
          inlineKeyboard: [
            [{ text: "🔍 مشاهده واچ‌لیست دیده‌بان", callback_data: "/watchlist_menu" }],
            [{ text: "🔙 بازگشت به جستجوی نماد", callback_data: `/search_prompt` }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/remove_wl_confirm")) {
        const symbol = data.replace("/remove_wl_confirm", "").trim().toUpperCase();
        const wl = settings.watchlist || [];
        if (wl.includes(symbol)) {
          updateChatSettings(chatId, { watchlist: wl.filter(s => s !== symbol) });
        }
        await sendMessage(chatId.toString(), `❌ نماد **#${symbol}** از واچ‌لیست دیده‌بان شما حذف شد.`, {
          inlineKeyboard: [
            [{ text: "🔍 مشاهده واچ‌لیست دیده‌بان", callback_data: "/watchlist_menu" }],
            [{ text: "🔙 بازگشت به جستجوی نماد", callback_data: `/search_prompt` }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/analyze")) {
        const parts = data.replace("/analyze", "").trim().split(" ");
        const symbol = parts[0]?.toUpperCase() || "BTCUSDT";
        const timeframe = parts[1] || settings.timeframe;
        let requestedEngine = parts[2] || settings.engineMode || globalConfig.defaultEngineMode || "ONLINE_AI";
        
        let effectiveEngineMode = requestedEngine;
        if (effectiveEngineMode === "ONLINE_AI" && !enableAi) {
          effectiveEngineMode = "OFFLINE_RULES";
        } else if (effectiveEngineMode === "OFFLINE_RULES" && !enableOffline) {
          effectiveEngineMode = "ONLINE_AI";
        }

        const timeHorizon = parts[3] || (timeframe === "1m" || timeframe === "5m" || timeframe === "15m" ? "scalp_minutes" : timeframe === "1h" || timeframe === "4h" ? "intraday_hours" : "swing_days");

        const marketData = await fetchLiveMarketData(symbol, timeframe || settings.timeframe || "15m");
        const setup = await generateAITradingAnalysis({
          symbol,
          timeframe,
          engineMode: effectiveEngineMode as any,
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

        const altEngineRow: any[] = [];
        if (enableAi && enableOffline) {
          altEngineRow.push({ text: `🧠 بررسی هوش مصنوعی`, callback_data: `/analyze ${symbol} ${timeframe} ONLINE_AI` });
          altEngineRow.push({ text: `📚 دانش آفلاین (SMC)`, callback_data: `/analyze ${symbol} ${timeframe} OFFLINE_RULES` });
        } else if (enableAi) {
          altEngineRow.push({ text: `🔄 به‌روزرسانی تحلیل AI`, callback_data: `/analyze ${symbol} ${timeframe} ONLINE_AI` });
        } else {
          altEngineRow.push({ text: `🔄 به‌روزرسانی ستاپ آفلاین SMC`, callback_data: `/analyze ${symbol} ${timeframe} OFFLINE_RULES` });
        }

        await sendMessage(chatId.toString(), setupMsg, {
          inlineKeyboard: [
            [
              { text: `⚡ اسکلپ (دقیقه‌ای)`, callback_data: `/analyze ${symbol} 15m ${effectiveEngineMode} scalp_minutes` },
              { text: `⏱️ درون‌روز (ساعتی)`, callback_data: `/analyze ${symbol} 1h ${effectiveEngineMode} intraday_hours` },
              { text: `📅 سوینگ (روزانه)`, callback_data: `/analyze ${symbol} 4h ${effectiveEngineMode} swing_days` },
            ],
            altEngineRow,
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

      if (data === "/admin" || data === "/admin_panel") {
        if (!isAdmin(chatId)) {
          return renderAdminAuthPrompt(chatId, botType, token, mainReplyMenu);
        }
        return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
      }

      if (data.startsWith("/admin_auth ")) {
        const pass = data.replace("/admin_auth ", "").trim();
        if (authenticateAdmin(chatId, pass)) {
          updateChatSettings(chatId, { pendingAdminPasscode: undefined });
          await sendMessage(chatId.toString(), `✅ **احراز هویت ادمین با موفقیت انجام شد.**\nخوش آمدید، به پنل مدیریت متصل شدید.`, { replyKeyboard: mainReplyMenu });
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        } else {
          await sendMessage(chatId.toString(), `❌ **رمز عبور نادرست است.**\nدسترسی به بخش مدیریت مسدود است.`, {
            inlineKeyboard: [[{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }]],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }
      }

      // Admin actions - strict permission guard
      if (data.startsWith("/admin_")) {
        if (!isAdmin(chatId)) {
          return renderAdminAuthPrompt(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_toggle_ai") {
          const cfg = getGlobalConfig();
          const newVal = !(cfg.enableAiEngine !== false);
          updateGlobalConfig({ enableAiEngine: newVal });
          await sendMessage(chatId.toString(), `⚙️ **موتور هوش مصنوعی آنلاین:** ${newVal ? "🟢 فعال شد" : "🔴 غیرفعال شد"}`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_toggle_offline") {
          const cfg = getGlobalConfig();
          const newVal = !(cfg.enableOfflineEngine !== false);
          updateGlobalConfig({ enableOfflineEngine: newVal });
          await sendMessage(chatId.toString(), `⚙️ **موتور استراتژی آفلاین SMC:** ${newVal ? "🟢 فعال شد" : "🔴 غیرفعال شد"}`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_toggle_def_engine") {
          const cfg = getGlobalConfig();
          const newMode = cfg.defaultEngineMode === "OFFLINE_RULES" ? "ONLINE_AI" : "OFFLINE_RULES";
          updateGlobalConfig({ defaultEngineMode: newMode });
          await sendMessage(chatId.toString(), `⚙️ **موتور پیش‌فرض سیستم تغییر کرد به:** ${newMode === "ONLINE_AI" ? "🧠 هوش مصنوعی آنلاین" : "📚 دانش آفلاین SMC"}`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_toggle_hunter") {
          const cfg = getGlobalConfig();
          const current = cfg.autoHunter?.enabled === true;
          updateGlobalConfig({
            autoHunter: {
              ...cfg.autoHunter,
              enabled: !current,
            }
          });
          await sendMessage(chatId.toString(), `⚙️ **شکارچی خودکار سراسری (Auto-Pilot):** ${!current ? "🟢 فعال شد" : "🔴 غیرفعال شد"}`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_toggle_tg_bc") {
          const cfg = getGlobalConfig();
          const current = cfg.autoHunter?.autoBroadcastToTelegram === true;
          updateGlobalConfig({
            autoHunter: {
              ...cfg.autoHunter,
              autoBroadcastToTelegram: !current,
            }
          });
          await sendMessage(chatId.toString(), `⚙️ **ارسال خودکار سیگنال به کانال/گروه تلگرام:** ${!current ? "🟢 روشن شد" : "🔴 خاموش شد"}`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_toggle_bale_bc") {
          const cfg = getGlobalConfig();
          const current = cfg.autoHunter?.autoBroadcastToBale === true;
          updateGlobalConfig({
            autoHunter: {
              ...cfg.autoHunter,
              autoBroadcastToBale: !current,
            }
          });
          await sendMessage(chatId.toString(), `⚙️ **ارسال خودکار سیگنال به کانال/گروه پیام‌رسان بله:** ${!current ? "🟢 روشن شد" : "🔴 خاموش شد"}`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_interval_menu") {
          await sendMessage(chatId.toString(), `⏱️ **انتخاب بازه زمانی اسکن و ارسال خودکار شکارچی (Auto-Hunter Interval):**`, {
            inlineKeyboard: [
              [
                { text: "⚡ هر ۱ دقیقه", callback_data: "/admin_set_interval 1", style: "primary" },
                { text: "⏱️ هر ۳ دقیقه", callback_data: "/admin_set_interval 3", style: "primary" },
                { text: "⏱️ هر ۵ دقیقه", callback_data: "/admin_set_interval 5", style: "primary" },
              ],
              [
                { text: "⏱️ هر ۱۵ دقیقه", callback_data: "/admin_set_interval 15", style: "primary" },
                { text: "⏱️ هر ۳۰ دقیقه", callback_data: "/admin_set_interval 30", style: "primary" },
                { text: "⏱️ هر ۱ ساعت", callback_data: "/admin_set_interval 60", style: "primary" },
              ],
              [{ text: "🔙 بازگشت به پنل مدیریت", callback_data: "/admin_panel" }]
            ],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }

        if (data.startsWith("/admin_set_interval ")) {
          const mins = parseInt(data.replace("/admin_set_interval ", ""), 10) || 3;
          const cfg = getGlobalConfig();
          updateGlobalConfig({
            autoHunter: {
              ...cfg.autoHunter,
              intervalMinutes: mins,
            }
          });
          await sendMessage(chatId.toString(), `✅ **بازه زمانی شکارچی با موفقیت به هر ${mins} دقیقه تغییر یافت.**`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_risk_menu") {
          await sendMessage(chatId.toString(), `🛡️ **انتخاب پروفایل پیش‌فرض مدیریت ریسک سیستم برای کاربران جدید:**`, {
            inlineKeyboard: [
              [
                { text: "🛡️ کم‌ریسک (Conservative - 1%)", callback_data: "/admin_set_risk conservative", style: "success" },
                { text: "⚖️ متعادل (Moderate - 2%)", callback_data: "/admin_set_risk moderate", style: "primary" },
              ],
              [
                { text: "🚀 تهاجمی (Aggressive - 3.5%)", callback_data: "/admin_set_risk aggressive", style: "danger" }
              ],
              [{ text: "🔙 بازگشت به پنل مدیریت", callback_data: "/admin_panel" }]
            ],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }

        if (data.startsWith("/admin_set_risk ")) {
          const profile = data.replace("/admin_set_risk ", "") as any;
          const cfg = getGlobalConfig();
          updateGlobalConfig({
            riskSettings: {
              ...cfg.riskSettings,
              profile,
              maxRiskPercent: profile === 'conservative' ? 1.0 : profile === 'aggressive' ? 3.5 : 2.0,
              maxLeverage: profile === 'conservative' ? 5 : profile === 'aggressive' ? 25 : 15,
              minRRRatio: profile === 'conservative' ? 2.0 : profile === 'aggressive' ? 3.5 : 2.5,
              tpStyle: profile === 'conservative' ? 'tight_safe' : profile === 'aggressive' ? 'extended_runner' : 'balanced',
            }
          });
          const profFa = profile === 'conservative' ? '🛡️ کم‌ریسک' : profile === 'aggressive' ? '🚀 تهاجمی' : '⚖️ متعادل';
          await sendMessage(chatId.toString(), `✅ پروفایل پیش‌فرض سیستم به **${profFa}** تغییر یافت.`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_tf_menu") {
          await sendMessage(chatId.toString(), `⏱️ **انتخاب تایم‌فریم پیش‌فرض سراسری سیستم:**`, {
            inlineKeyboard: [
              [
                { text: "1m", callback_data: "/admin_set_tf 1m" },
                { text: "5m", callback_data: "/admin_set_tf 5m" },
                { text: "15m", callback_data: "/admin_set_tf 15m" },
              ],
              [
                { text: "1h", callback_data: "/admin_set_tf 1h" },
                { text: "4h", callback_data: "/admin_set_tf 4h" },
                { text: "1D", callback_data: "/admin_set_tf 1D" },
              ],
              [{ text: "🔙 بازگشت به پنل مدیریت", callback_data: "/admin_panel" }]
            ],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }

        if (data.startsWith("/admin_set_tf ")) {
          const tf = data.replace("/admin_set_tf ", "") as any;
          updateGlobalConfig({ defaultTimeframe: tf });
          await sendMessage(chatId.toString(), `✅ تایم‌فریم پیش‌فرض سیستم به **${tf}** تغییر کرد.`);
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        }

        if (data === "/admin_prompt_broadcast") {
          updateChatSettings(chatId, { pendingAdminBroadcast: true });
          await sendMessage(chatId.toString(), `📢 **ارسال پیام همگانی (Broadcast) به تمام کاربران** 📢\n\nلطفا متن پیام مورد نظر را بنویسید و ارسال فرمایید تا بلافاصله به تمام کاربران ثبت‌شده در سیستم ارسال گردد:`, {
            inlineKeyboard: [[{ text: "🔙 انصراف و بازگشت", callback_data: "/admin_panel" }]],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }

        if (data === "/admin_prompt_chpass") {
          updateChatSettings(chatId, { pendingAdminPasscode: true });
          await sendMessage(chatId.toString(), `🔑 **تغییر رمز عبور پنل مدیریت (Admin Passcode)**\n\nلطفا رمز عبور جدید مورد نظرتان را تایپ و ارسال کنید:`, {
            inlineKeyboard: [[{ text: "🔙 انصراف و بازگشت", callback_data: "/admin_panel" }]],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }

        if (data === "/admin_logout") {
          deauthenticateAdmin(chatId);
          await sendMessage(chatId.toString(), `🚪 **شما با موفقیت از حالت ادمین خارج شدید.**`, {
            replyKeyboard: mainReplyMenu,
          });
          return runAction(chatId, "/main_menu");
        }
      }

      if (data.startsWith("/quote_menu ")) {
        const base = data.replace("/quote_menu ", "").trim();
        await showQuoteSelectionMenu(chatId, base, botType, token, settings, mainReplyMenu);
        return;
      }

      if (data.startsWith("/quote_select ")) {
        const parts = data.replace("/quote_select ", "").trim().split(" ");
        const base = parts[0];
        const quote = parts[1] || "USDT";
        const symbol = `${base}${quote}`;
        return handleSymbolSearch(chatId, symbol, botType, token, settings, mainReplyMenu);
      }

      if (data.startsWith("/prompt_quote ")) {
        const base = data.replace("/prompt_quote ", "").trim();
        updateChatSettings(chatId, { pendingCustomQuoteBase: base });
        await sendMessage(chatId.toString(), `✏️ **ورود دستی واحد معاملاتی برای نماد #${base}**\n\nلطفا نام واحد مورد نظر خود را بنویسید و ارسال کنید (مثلاً: \`USDT\`، \`USD\`، \`EUR\`، \`IRT\`، \`USDC\`، \`BTC\`، \`DAI\`):\n\nپس از ارسال، جفت‌ارز **${base}/واحد** به صورت خودکار تحلیل و نمایش داده می‌شود.`, {
          inlineKeyboard: [
            [{ text: `💵 پیش‌فرض تتر (${base}USDT)`, callback_data: `/analyze ${base}USDT` }],
            [{ text: "🔙 انصراف و بازگشت", callback_data: `/quote_menu ${base}` }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/scanner") {
        await sendMessage(chatId.toString(), `⏳ **در حال اسکن عمیق و محاسباتی بازار با فرمول‌های اسمارت‌مانی و اندیکاتورهای زنده...**\n\nلطفاً چند ثانیه شکیبا باشید تا وضعیت RSI، سطوح اردربلاک، میانگین‌های EMA و حجم نقدینگی به صورت لحظه‌ای ارزیابی شوند.`, {
          replyKeyboard: mainReplyMenu,
        });

        const pool = (settings.watchlist && settings.watchlist.length > 0)
          ? settings.watchlist
          : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT', 'ADAUSDT', 'SUIUSDT', 'PEPEUSDT', 'AVAXUSDT', 'LINKUSDT', 'XAUUSD'];

        const opps = await scanAuthenticMarketOpportunities(pool, settings.timeframe || "15m", settings);

        const scanHeader = `🎯 **شکارچی و اسکنر هوشمند فرصت‌های معاملاتی بازار** 🎯\n` +
          `⚡ **روش ارزیابی:** تحلیل زنده کندل‌ها، تقاطع میانگین‌های متحرک، شاخص RSI و اردربلاک‌های SMC (بدون تکرار تصادفی)\n\n`;

        if (opps.length === 0) {
          await sendMessage(chatId.toString(), scanHeader + `⚠️ در حال حاضر هیچ دارایی‌ای شرایط ورود با ضریب اطمینان بالا (A+) را برآورده نکرده است. لطفا دقایقی دیگر مجدداً اسکن کنید یا تایم‌فریم را تغییر دهید.`, {
            inlineKeyboard: [
              [{ text: "🔄 اسکن مجدد بازار", callback_data: "/scanner" }],
              [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }]
            ],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }

        const topOpps = opps.slice(0, 4);
        const text = scanHeader + topOpps.map((s, idx) => {
          const actionFa = s.action === "LONG" ? "🟢 لانگ (خرید)" : "🔴 شورت (فروش)";
          return `${idx + 1}. 🔹 **#${s.symbol}** (${actionFa} | گرید: **${s.grade}**)\n` +
                 `   • 💰 قیمت زنده: **$${s.currentPrice.toLocaleString()}**\n` +
                 `   • 📍 زون ورود: **$${s.entryZone[0].toLocaleString()} - $${s.entryZone[1].toLocaleString()}**\n` +
                 `   • 🎯 تارگت اول: **$${s.tp1.toLocaleString()}** | 🛑 استاپ: **$${s.sl.toLocaleString()}**\n` +
                 `   • 💎 نسبت ریسک/ریوارد: **1:${s.rrRatio}** | شاخص RSI: **${s.rsi.toFixed(1)}**\n` +
                 `   • 🔍 علت تکنیکال: _${s.setupReasonFa}_`;
        }).join("\n\n----------------------------------------\n\n");

        await sendMessage(chatId.toString(), text, {
          inlineKeyboard: [
            ...topOpps.map(s => [{ text: `📊 دریافت ستاپ جامع و کامل #${s.symbol}`, callback_data: `/analyze ${s.symbol}` }]),
            [{ text: "🔄 به‌روزرسانی اسکنر زنده", callback_data: "/scanner" }, { text: "🔍 مدیریت دیده‌بان", callback_data: "/watchlist_menu" }],
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }]
          ],
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
        await sendMessage(chatId.toString(), `✅ موتور تحلیل به **📚 قوانین و استراتژی آفلاین SMC (بدون هوش مصنوعی / با دیتای زنده کندل‌ها و قیمت لحظه‌ای)** تغییر یافت.`, {
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
        await sendMessage(chatId.toString(), `💵 **تنظیم موجودی حساب معاملاتی (سرمایه کل)**\n\nیکی از موجودی‌های پیش‌فرض زیر را انتخاب کنید یا روی دکمه ورود دستی ضربه بزنید:`, {
          inlineKeyboard: [
            [
              { text: "💵 $500", callback_data: "/set_bal_val 500" },
              { text: "💵 $1,000", callback_data: "/set_bal_val 1000" },
              { text: "💵 $2,500", callback_data: "/set_bal_val 2500" }
            ],
            [
              { text: "💵 $5,000", callback_data: "/set_bal_val 5000" },
              { text: "💵 $10,000", callback_data: "/set_bal_val 10000" },
              { text: "💵 $50,000", callback_data: "/set_bal_val 50000" }
            ],
            [
              { text: "✏️ ورود دستی عدد دلخواه", callback_data: "/prompt_balance" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_bal_val ")) {
        const val = parseFloat(data.replace("/set_bal_val ", "").trim());
        updateChatSettings(chatId, { balance: val });
        await sendMessage(chatId.toString(), `✅ موجودی کل حساب شما با موفقیت روی **$${val.toLocaleString()}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/prompt_balance") {
        await sendMessage(chatId.toString(), `✏️ **ورود دستی سرمایه کل حساب**\n\nلطفا موجودی دلخواه خود را به دلار به صورت عدد انگلیسی بنویسید و ارسال کنید:\n\nمثال: \`2500\``, {
          inlineKeyboard: [[{ text: "🔙 انصراف و بازگشت", callback_data: "/menu_balance" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_risk_percent") {
        await sendMessage(chatId.toString(), `⚖️ **تنظیم درصد ریسک هر معامله**\n\nدرصد ریسک مجاز در هر پوزیشن را انتخاب کنید یا دستی وارد کنید:`, {
          inlineKeyboard: [
            [
              { text: "🛡️ 0.5%", callback_data: "/set_risk_val 0.5" },
              { text: "🛡️ 1.0%", callback_data: "/set_risk_val 1.0" },
              { text: "⚖️ 1.5%", callback_data: "/set_risk_val 1.5" }
            ],
            [
              { text: "⚖️ 2.0%", callback_data: "/set_risk_val 2.0" },
              { text: "🚀 3.0%", callback_data: "/set_risk_val 3.0" },
              { text: "🚀 5.0%", callback_data: "/set_risk_val 5.0" }
            ],
            [
              { text: "✏️ ورود دستی درصد ریسک", callback_data: "/prompt_risk" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_risk_val ")) {
        const val = parseFloat(data.replace("/set_risk_val ", "").trim());
        updateChatSettings(chatId, { riskPercent: val });
        await sendMessage(chatId.toString(), `✅ درصد ریسک معاملات شما با موفقیت روی **${val}%** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/prompt_risk") {
        await sendMessage(chatId.toString(), `✏️ **ورود دستی درصد ریسک معامله**\n\nلطفا درصد ریسک دلخواه خود در هر پوزیشن (بین ۰.۱٪ تا ۱۰٪) را به عدد انگلیسی بنویسید و ارسال کنید:\n\nمثال: \`1.5\``, {
          inlineKeyboard: [[{ text: "🔙 انصراف و بازگشت", callback_data: "/menu_risk_percent" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_leverage") {
        await sendMessage(chatId.toString(), `🚀 **تنظیم سقف اهرم معاملاتی (Max Leverage)**\n\nحداکثر لوریج مجاز پوزیشن‌ها را انتخاب کنید یا دستی وارد کنید:`, {
          inlineKeyboard: [
            [
              { text: "🚀 1x", callback_data: "/set_lev_val 1" },
              { text: "🚀 3x", callback_data: "/set_lev_val 3" },
              { text: "🚀 5x", callback_data: "/set_lev_val 5" }
            ],
            [
              { text: "🚀 10x", callback_data: "/set_lev_val 10" },
              { text: "🚀 20x", callback_data: "/set_lev_val 20" },
              { text: "🚀 50x", callback_data: "/set_lev_val 50" }
            ],
            [
              { text: "✏️ ورود دستی اهرم", callback_data: "/prompt_leverage" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_lev_val ")) {
        const val = parseInt(data.replace("/set_lev_val ", "").trim());
        updateChatSettings(chatId, { leverage: val });
        await sendMessage(chatId.toString(), `✅ سقف اهرم معاملاتی پوزیشن‌ها با موفقیت روی **${val}x** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/prompt_leverage") {
        await sendMessage(chatId.toString(), `✏️ **ورود دستی سقف اهرم معامله**\n\nلطفا حداکثر اهرم دلخواه خود (بین ۱ تا ۱۲۵) را به صورت عدد انگلیسی بنویسید و ارسال کنید:\n\nمثال: \`15\``, {
          inlineKeyboard: [[{ text: "🔙 انصراف و بازگشت", callback_data: "/menu_leverage" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_min_rr") {
        await sendMessage(chatId.toString(), `💎 **تنظیم حداقل نسبت پاداش به ریسک (Min Risk:Reward)**\n\nحداقل نسبت R:R مورد انتظار در ستاپ‌ها را انتخاب کنید یا دستی وارد کنید:`, {
          inlineKeyboard: [
            [
              { text: "💎 1:1.5", callback_data: "/set_rr_val 1.5" },
              { text: "💎 1:2.0", callback_data: "/set_rr_val 2.0" },
              { text: "💎 1:2.5", callback_data: "/set_rr_val 2.5" }
            ],
            [
              { text: "💎 1:3.0", callback_data: "/set_rr_val 3.0" },
              { text: "💎 1:4.0", callback_data: "/set_rr_val 4.0" },
              { text: "💎 1:5.0", callback_data: "/set_rr_val 5.0" }
            ],
            [
              { text: "✏️ ورود دستی R:R", callback_data: "/prompt_min_rr" }
            ],
            [{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data.startsWith("/set_rr_val ")) {
        const val = parseFloat(data.replace("/set_rr_val ", "").trim());
        updateChatSettings(chatId, { minRRRatio: val });
        await sendMessage(chatId.toString(), `✅ حداقل نسبت پاداش به ریسک (R:R) روی **1:${val}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/prompt_min_rr") {
        await sendMessage(chatId.toString(), `✏️ **ورود دستی حداقل R:R مورد انتظار**\n\nلطفا نسبت پاداش به ریسک مورد نظر خود (بین ۱ تا ۱۰) را به صورت عدد انگلیسی بنویسید و ارسال کنید:\n\nمثال: \`2.5\``, {
          inlineKeyboard: [[{ text: "🔙 انصراف و بازگشت", callback_data: "/menu_min_rr" }]],
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
              { text: "➕ مدیریت واچ‌لیست", callback_data: "/watchlist_menu" }
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
        await sendMessage(chatId.toString(), `➕ **افزودن سریع نماد به واچ‌لیست دیده‌بان**\n\nیکی از دارایی‌های پرطرفدار زیر را انتخاب کنید یا روی ورود دستی ضربه بزنید:`, {
          inlineKeyboard: [
            [
              { text: "🪙 BTC", callback_data: "/add_wl_confirm BTCUSDT" },
              { text: "🪙 ETH", callback_data: "/add_wl_confirm ETHUSDT" },
              { text: "🪙 SOL", callback_data: "/add_wl_confirm SOLUSDT" }
            ],
            [
              { text: "🪙 XRP", callback_data: "/add_wl_confirm XRPUSDT" },
              { text: "🪙 ADA", callback_data: "/add_wl_confirm ADAUSDT" },
              { text: "🪙 DOGE", callback_data: "/add_wl_confirm DOGEUSDT" }
            ],
            [
              { text: "🥇 GOLD", callback_data: "/add_wl_confirm XAUUSD" },
              { text: "💱 EURUSD", callback_data: "/add_wl_confirm EURUSD" },
              { text: "📈 Tesla", callback_data: "/add_wl_confirm TSLA" }
            ],
            [
              { text: "✏️ ورود دستی نام نماد دلخواه", callback_data: "/prompt_hunter_add" }
            ],
            [{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/watchlist_menu" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/prompt_hunter_add") {
        await sendMessage(chatId.toString(), `✏️ **ورود دستی نام نماد برای افزودن**\n\nلطفا نام نماد مورد نظر خود را ارسال کنید تا مستقیما تحلیل شده و به واچ‌لیست شما اضافه شود:\n\nمثال: \`SOLUSDT\` یا \`GBPUSD\``, {
          inlineKeyboard: [[{ text: "🔙 انصراف و بازگشت", callback_data: "/hunter_add" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/hunter_remove") {
        const wl = settings.watchlist || [];
        if (wl.length === 0) {
          await sendMessage(chatId.toString(), `⚠️ واچ‌لیست دیده‌بان شما خالی است. هیچ نمادی برای حذف وجود ندارد.`, {
            inlineKeyboard: [[{ text: "🔙 بازگشت", callback_data: "/watchlist_menu" }]],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }

        const rows = [];
        for (let i = 0; i < wl.length; i += 2) {
          const row = [];
          row.push({ text: `❌ #${wl[i]}`, callback_data: `/remove_wl_confirm ${wl[i]}` });
          if (wl[i+1]) {
            row.push({ text: `❌ #${wl[i+1]}`, callback_data: `/remove_wl_confirm ${wl[i+1]}` });
          }
          rows.push(row);
        }
        rows.push([{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/watchlist_menu" }]);

        await sendMessage(chatId.toString(), `❌ **حذف آسان نماد از واچ‌لیست دیده‌بان**\n\nروی هر کدام از نمادهای زیر کلیک کنید تا بلافاصله از دیده‌بان شکارچی شما حذف شود:`, {
          inlineKeyboard: rows,
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
              { text: "🔍 𝖲𝖤𝖠𝖱𝖢𝖧 | 🔎 جستجوی نماد خاص", callback_data: "/search_prompt" }
            ],
            [
              { text: "🟢 𝖠𝖣𝖣 | ➕ افزودن سریع", callback_data: "/hunter_add" },
              { text: "🔴 𝖱𝖤𝖬𝖮𝖵𝖤 | ➖ حذف سریع", callback_data: "/hunter_remove" }
            ],
            [
              { text: "⚙️ تنظیمات شکارچی", callback_data: "/menu_hunter" },
              { text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }
            ]
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

    if (text === "/start" || text === "شروع") {
      if (!settings.termsAccepted) {
        const startRulesText = `👋 **خوش آمدید به ربات تریدینگ‌ویو و دستیار هوشمند سیگنال!**\n\nبرای شروع و ورود به ربات، جهت شفافیت کامل در بازارهای مالی، لطفاً ابتدا قوانین و سلب مسئولیت حقوقی زیر را مطالعه نموده و روی دکمه **«موافق قوانین هستم و می‌پذیرم»** ضربه بزنید:\n\n` + legalRulesMessage;
        await sendMessage(chatId.toString(), startRulesText, {
          inlineKeyboard: [
            [{ text: "✅ موافق قوانین هستم و می‌پذیرم", callback_data: "/accept_terms", style: "success" }],
          ],
        });
        return;
      }
    }

    if (text === "موافق قوانین هستم" || text === "موافق هستم" || text === "قبول قوانین" || text === "تایید قوانین") {
      updateChatSettings(chatId, { termsAccepted: true, termsAcceptedAt: Date.now() });
      await sendMessage(chatId.toString(), `✅ **قوانین و شرایط سلب مسئولیت حقوقی با موفقیت تایید شد.**\n\n🎉 دسترسی شما به تمامی امکانات، ستاپ‌های هوش مصنوعی آنلاین، استراتژی آفلاین و ابزارهای تریدینگ‌ویو فعال گردید.`, {
        replyKeyboard: mainReplyMenu,
      });
      return runAction(chatId, "/main_menu");
    }

    if (text === "/rules" || text === "/disclaimer" || text === "⚖️ قوانین و سلب مسئولیت حقوقی" || text === "قوانین") {
      const inlineKeyboard = !settings.termsAccepted
        ? [
            [{ text: "✅ موافق قوانین هستم و می‌پذیرم", callback_data: "/accept_terms", style: "success" }],
          ]
        : [
            [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }],
          ];

      await sendMessage(chatId.toString(), legalRulesMessage, {
        inlineKeyboard,
        replyKeyboard: settings.termsAccepted ? mainReplyMenu : undefined,
      });
      return;
    }

    // Gating check: if terms are not accepted, block all other commands
    if (!settings.termsAccepted) {
      await sendMessage(chatId.toString(), `⚠️ **توجه الزامی:** برای ورود و استفاده از خدمات تحلیلی ربات، ابتدا باید قوانین و شرایط سلب مسئولیت حقوقی را تأیید فرمایید.`, {
        inlineKeyboard: [
          [{ text: "✅ موافق قوانین هستم و می‌پذیرم", callback_data: "/accept_terms", style: "success" }],
          [{ text: "⚖️ مطالعه متن کامل قوانین", callback_data: "/rules", style: "primary" }],
        ],
      });
      return;
    }

    if (text === "/start" || text === "شروع" || text === "سلام" || text === "/main_menu") {
      const platformSuffix = botType === "bale" ? " (بله)" : "";
      const welcome = `👋 **سلام! به بات تریدینگ‌ویو، تحلیل تکنیکال و سیگنال‌های دوگانه (هوش مصنوعی + دانش آفلاین) خوش آمدید${platformSuffix}.**

سیستم دارای دو موتور تولید ستاپ معاملاتی است:
${enableAi ? "🧠 **۱. هوش مصنوعی آنلاین:** تحلیل بلادرنگ و مولتی‌مدال پرایس اکشن (فعال)\n" : "🧠 **۱. هوش مصنوعی آنلاین:** (غیرفعال توسط مدیر)\n"}${enableOffline ? "📚 **۲. دانش و استراتژی آفلاین:** الگوریتم قوانین ثابت اسمارت‌مانی SMC (فعال)" : "📚 **۲. دانش و استراتژی آفلاین:** (غیرفعال توسط مدیر)"}

امکانات پنل به صورت **دکمه‌های شیشه‌ای با استایل رنگی** و **منوی زیر چت** در دسترس است:`;

      const engineRows: any[] = [];
      if (enableAi && enableOffline) {
        engineRows.push([{ text: "🧠 𝖮𝖭𝖫𝖨𝖭𝖤 | 🟡 تحلیل هوش مصنوعی BTC", callback_data: "/analyze BTCUSDT 15m ONLINE_AI", style: "success" }]);
        engineRows.push([{ text: "📚 𝖮𝖥𝖥𝖫𝖨𝖭𝖤 | 🟡 ستاپ آفلاین SMC BTC", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES", style: "primary" }]);
      } else if (enableAi) {
        engineRows.push([{ text: "🧠 𝖮𝖭𝖫𝖨𝖭𝖤 | 🟡 تحلیل هوش مصنوعی BTC", callback_data: "/analyze BTCUSDT 15m ONLINE_AI", style: "success" }]);
      } else {
        engineRows.push([{ text: "📚 𝖮𝖥𝖥𝖫𝖨𝖭𝖤 | 🟡 ستاپ آفلاین SMC BTC", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES", style: "primary" }]);
      }

      await sendMessage(chatId.toString(), welcome, {
        inlineKeyboard: [
          ...engineRows,
          [
            { text: "🔵 تحلیل زنده ETH", callback_data: `/analyze ETHUSDT 15m ${enableAi ? 'ONLINE_AI' : 'OFFLINE_RULES'}`, style: "success" },
            { text: "🟣 تحلیل زنده SOL", callback_data: `/analyze SOLUSDT 15m ${enableAi ? 'ONLINE_AI' : 'OFFLINE_RULES'}`, style: "success" },
          ],
          [
            { text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner", style: "success" },
            { text: "⚙️ تنظیمات کاربری و ریسک", callback_data: "/settings_risk", style: "primary" },
          ],
          [
            { text: "🔔 شکارچی خودکار (Hunter)", callback_data: "/menu_hunter", style: "primary" },
            { text: "🧮 محاسبه حجم معامله (Calc)", callback_data: "/calc", style: "primary" },
          ],
          [
            { text: "📂 ژورنال معاملات چت", callback_data: "/history_menu", style: "primary" },
            { text: "🔍 مدیریت واچ‌لیست دیده‌بان", callback_data: "/watchlist_menu", style: "primary" }
          ],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text.startsWith("/search")) {
      const symbol = text.replace("/search", "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!symbol) {
        await sendMessage(chatId.toString(), `❌ لطفا نام نماد را وارد کنید. مثال:\n\`/search BTCUSDT\``, { replyKeyboard: mainReplyMenu });
      } else {
        await handleSymbolSearch(chatId, symbol, botType, token, settings, mainReplyMenu);
      }
    } else if (text === "🧠 تحلیل هوش مصنوعی") {
      if (!enableAi) {
        await sendMessage(chatId.toString(), "⚠️ **توجه:** موتور تحلیل هوش مصنوعی آنلاین موقتاً توسط مدیر در پنل تنظیمات غیرفعال شده است.\n\nمی‌توانید از **موتور دانش و الگوریتم‌های پرایس‌اکشن آفلاین (SMC)** استفاده نمایید.", {
          inlineKeyboard: [
            [{ text: "📚 ورود به بخش تحلیل آفلاین SMC", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" }],
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
      } else {
        await sendMessage(chatId.toString(), "🧠 **تحلیل با هوش مصنوعی آنلاین (Gemini AI):**\nیک دارایی را انتخاب کنید:", {
          inlineKeyboard: [
            [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m ONLINE_AI" }],
            [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m ONLINE_AI" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h ONLINE_AI" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      }
    } else if (text === "📚 دانش و استراتژی آفلاین" || text === "📚 استراتژی آفلاین SMC") {
      if (!enableOffline) {
        await sendMessage(chatId.toString(), "⚠️ **توجه:** موتور دانش و استراتژی آفلاین موقتاً توسط مدیر در پنل تنظیمات غیرفعال شده است.\n\nمی‌توانید از **موتور تحلیل هوش مصنوعی آنلاین** استفاده نمایید.", {
          inlineKeyboard: [
            [{ text: "🧠 ورود به بخش تحلیل هوش مصنوعی", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" }],
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }]
          ],
          replyKeyboard: mainReplyMenu,
        });
      } else {
        const label = botType === "bale" ? "SMC Rules" : "SMC";
        await sendMessage(chatId.toString(), `📚 **تحلیل با متدولوژی و دانش آفلاین (Smart Money Concepts & ${label}):**\nدارایی مورد نظر را انتخاب کنید:`, {
          inlineKeyboard: [
            [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m OFFLINE_RULES" }],
            [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m OFFLINE_RULES" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h OFFLINE_RULES" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      }
    } else if (text === "📊 تحلیل فوری ارزها") {
      const defMode = enableAi ? "ONLINE_AI" : "OFFLINE_RULES";
      await sendMessage(chatId.toString(), "🔍 ارز یا دارایی مورد نظرتان را انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: `/analyze BTCUSDT 15m ${defMode}` }, { text: "🔷 اتریوم (ETH)", callback_data: `/analyze ETHUSDT 15m ${defMode}` }],
          [{ text: "🟣 سولانا (SOL)", callback_data: `/analyze SOLUSDT 15m ${defMode}` }, { text: "👑 انس طلا (XAU)", callback_data: `/analyze XAUUSD 1h ${defMode}` }],
          [{ text: "🟢 سهام انویدیا (NVDA)", callback_data: `/analyze NVDA 1h ${defMode}` }, { text: "🐕 دوج‌کوین (DOGE)", callback_data: `/analyze DOGEUSDT 15m ${defMode}` }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "🎯 اسکنر هوشمند بازار" || text === "/scanner") {
      await runAction(chatId, "/scanner");
    } else if (text === "⚙️ تنظیمات ریسک و سود" || text === "/settings" || text === "/settings_risk") {
      await runAction(chatId, "/settings_risk");
    } else if (text === "🧮 محاسبه حجم و مارجین") {
      await runCommand(chatId, "/calc");
    } else if (text === "🔔 شکار خودکار فرصت‌ها" || text === "/menu_hunter") {
      await runAction(chatId, "/menu_hunter");
    } else if (text === "🔍 واچ‌لیست دیده‌بان" || text === "/watchlist" || text === "/watchlist_menu") {
      await runAction(chatId, "/watchlist_menu");
    } else if (text === "📂 تاریخچه و ژورنال" || text === "/journal" || text === "/history_menu") {
      await runAction(chatId, "/history_menu");
    } else if (text === "⚖️ قوانین و سلب مسئولیت حقوقی" || text === "/rules") {
      await sendMessage(chatId.toString(), legalRulesMessage, {
        inlineKeyboard: [
          [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
          [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "👑 پنل مدیریت ادمین" || text === "/admin" || text === "/admin_panel" || text === "ادمین") {
      if (!isAdmin(chatId)) {
        return renderAdminAuthPrompt(chatId, botType, token, mainReplyMenu);
      }
      return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
    } else {
      // Check if user was entering admin passcode
      if (settings.pendingAdminPasscode) {
        updateChatSettings(chatId, { pendingAdminPasscode: undefined });
        if (authenticateAdmin(chatId, text)) {
          await sendMessage(chatId.toString(), `✅ **احراز هویت ادمین با موفقیت انجام شد.**\nخوش آمدید، به پنل مدیریت متصل شدید.`, { replyKeyboard: mainReplyMenu });
          return renderAdminDashboard(chatId, botType, token, mainReplyMenu);
        } else {
          await sendMessage(chatId.toString(), `❌ **رمز عبور ادمین نادرست است.**\nدسترسی به بخش مدیریت برای شما امکان‌پذیر نیست.`, {
            inlineKeyboard: [[{ text: "🔙 منوی اصلی", callback_data: "/main_menu" }]],
            replyKeyboard: mainReplyMenu,
          });
          return;
        }
      }

      // Check if admin was sending a broadcast message
      if (settings.pendingAdminBroadcast && isAdmin(chatId)) {
        updateChatSettings(chatId, { pendingAdminBroadcast: undefined });
        const allChatKeys = Object.keys(settingsStore).filter(k => !k.startsWith("__"));
        let count = 0;
        const bcText = `📢 **اطلاعیه رسمی مدیریت ربات تریدینگ‌ویو** 📢\n\n${text}\n\n------------------------\n_ارسال شده توسط ادمین سیستم_`;
        for (const targetId of allChatKeys) {
          try {
            if (botType === "telegram") {
              await sendTelegramMessage(token, targetId, bcText);
            } else {
              await sendBaleMessage(token, targetId, bcText);
            }
            count++;
          } catch (e) {
            // Ignore individual failed chat deliveries
          }
        }
        await sendMessage(chatId.toString(), `✅ **پیام همگانی با موفقیت برای ${count} چت/کاربر ارسال شد.**`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به پنل مدیریت", callback_data: "/admin_panel" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      // Check if user was in the middle of typing a custom quote currency for a base asset
      if (settings.pendingCustomQuoteBase) {
        const base = settings.pendingCustomQuoteBase;
        updateChatSettings(chatId, { pendingCustomQuoteBase: undefined });
        const quote = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (quote) {
          const fullPair = `${base}${quote}`;
          return handleSymbolSearch(chatId, fullPair, botType, token, settings, mainReplyMenu);
        }
      }

      const numVal = parseFloat(text);
      if (!isNaN(numVal) && /^[0-9]+(\.[0-9]+)?$/.test(text.trim())) {
        await sendMessage(chatId.toString(), `❓ **تشخیص خودکار ورودی عددی**\n\nشما عدد **${text}** را بدون دستور ارسال کرده‌اید. مایلید این مقدار روی کدام‌یک از تنظیمات معاملاتی شما اعمال شود؟`, {
          inlineKeyboard: [
            [
              { text: `💵 سرمایه حساب ($${numVal.toLocaleString()})`, callback_data: `/set_bal_val ${numVal}` },
              { text: `⚖️ درصد ریسک (${numVal}%)`, callback_data: `/set_risk_val ${numVal}` }
            ],
            [
              { text: `🚀 ضریب اهرم (${numVal}x)`, callback_data: `/set_lev_val ${numVal}` },
              { text: `💎 حداقل R:R (نسبت 1:${numVal})`, callback_data: `/set_rr_val ${numVal}` }
            ],
            [
              { text: `❌ انصراف و منوی تنظیمات`, callback_data: `/settings_risk` }
            ]
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      const parts = text.split(/\s+/);
      const symbol = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, "");

      // Check if it's a plain symbol (just one word, 2-12 characters)
      const isPlainSymbol = /^[A-Z0-9]{2,12}$/i.test(text);
      if (isPlainSymbol && parts.length === 1) {
        await handleSymbolSearch(chatId, symbol, botType, token, settings, mainReplyMenu);
      } else {
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
    }
  } catch (err) {
    console.error(`Unified bot handler error [${botType}]:`, err);
  }
}
