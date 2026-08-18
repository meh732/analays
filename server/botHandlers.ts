import fetch from "node-fetch";
import { POPULAR_MARKETS, fetchLiveMarketData } from "./market.js";
import { generateAITradingAnalysis } from "./gemini.js";
import { sendTelegramMessage, sendBaleMessage } from "./bots.js";
import { getChatSettings, updateChatSettings, getGlobalConfig, settingsStore } from "./botSettingsStore.js";

// De-duplication cache for hunter alerts
const hunterAlertCache = new Map<string, number>();

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

export async function handleTelegramUpdate(token: string, update: any) {
  try {
    const message = update?.message;
    const callbackQuery = update?.callback_query;
    
    const legalRulesMessage = `⚖️ **قوانین استفاده و سلب مسئولیت حقوقی ربات تریدینگ‌ویو** ⚖️

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
      [{ text: "🧠 تحلیل هوش مصنوعی" }, { text: "📚 دانش و استراتژی آفلاین" }],
      [{ text: "⚙️ تنظیمات ریسک و سود" }, { text: "🧮 محاسبه حجم و مارجین" }],
      [{ text: "🔔 شکار خودکار فرصت‌ها" }, { text: "⚖️ قوانین و سلب مسئولیت حقوقی" }],
    ];

    if (callbackQuery) {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      const settings = getChatSettings(chatId);
      
      if (data === "/rules" || data === "/disclaimer") {
        await sendTelegramMessage(token, chatId.toString(), legalRulesMessage, {
          inlineKeyboard: [
            [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }
      
      if (data === "/main_menu") {
        const welcome = `👋 **سلام! به بات تریدینگ‌ویو، تحلیل تکنیکال و سیگنال‌های دوگانه (هوش مصنوعی + دانش آفلاین) خوش آمدید.**

سیستم دارای دو موتور تولید ستاپ معاملاتی است:
🧠 **۱. هوش مصنوعی آنلاین:** تحلیل بلادرنگ و مولتی‌مدال پرایس اکشن
📚 **۲. دانش و استراتژی آفلاین:** الگوریتم قوانین ثابت اسمارت‌مانی (SMC)، اردربلاک، هانت نقدینگی و فیبوناچی

امکانات پنل به صورت **دکمه‌های شیشه‌ای** و **منوی زیر چت** در دسترس است:`;
        await sendTelegramMessage(token, chatId.toString(), welcome, {
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
              { text: "🔔 شکار خودکار فرصت‌ها", callback_data: "/auto_hunter" },
              { text: "🧮 محاسبه‌گر حجم", callback_data: "/calc" },
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
          timeHorizon: timeHorizon as any,
          riskSettings: {
            profile: settings.riskProfile,
            maxRiskPercent: settings.riskPercent,
          }
        }, marketData);
        
        await sendTelegramMessage(token, chatId.toString(), setup.telegramMessage, {
          inlineKeyboard: [
            [
              { text: `⚡ اسکلپ (دقیقه‌ای)`, callback_data: `/analyze ${symbol} 15m ${engineMode} scalp_minutes` },
              { text: `⏱️ درون‌روز (ساعتی)`, callback_data: `/analyze ${symbol} 1h ${engineMode} intraday_hours` },
              { text: `📅 سوینگ (روزانه)`, callback_data: `/analyze ${symbol} 4h ${engineMode} swing_days` },
            ],
            [
              { text: `🧠 بررسی با هوش مصنوعی`, callback_data: `/analyze ${symbol} ${timeframe} ONLINE_AI` },
              { text: `📚 بررسی با دانش آفلاین (SMC)`, callback_data: `/analyze ${symbol} ${timeframe} OFFLINE_RULES` },
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
              riskSettings: { profile: settings.riskProfile, maxRiskPercent: settings.riskPercent }
            }, md);
          })
        );
        const text = `🎯 **اسکن فوری برترین فرصت‌های بازار** 🎯\n\n` +
          setups.map(s => `🔹 **${s.symbol}**: جهت ${s.action === "LONG" ? "🟢 لانگ" : "🔴 شورت"} | ورود: $${s.optimalEntry} | تارگت: $${s.takeProfits[0]?.price}`).join("\n\n");
        await sendTelegramMessage(token, chatId.toString(), text, {
          inlineKeyboard: setups.map(s => [{ text: `📊 دریافت ستاپ کامل ${s.symbol}`, callback_data: `/analyze ${s.symbol}` }]),
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/settings_risk") {
        const profileFa = settings.riskProfile === 'conservative' ? '🛡️ کم‌ریسک' : settings.riskProfile === 'aggressive' ? '🚀 تهاجمی' : '⚖️ متعادل';
        const engineFa = settings.engineMode === 'ONLINE_AI' ? '🧠 هوش مصنوعی آنلاین' : '📚 دانش آفلاین SMC';
        const timingMsg = `⚙️ **تنظیمات کاربری ربات تریدینگ‌ویو** ⚙️\n\n` +
          `📊 **تنظیمات فعلی شما:**\n` +
          `• 🛡️ پروفایل ریسک: **${profileFa}**\n` +
          `• ⏱️ تایم‌فریم پیش‌فرض: **${settings.timeframe}**\n` +
          `• 🧠 موتور تحلیلی: **${engineFa}**\n` +
          `• 💵 سرمایه معاملاتی: **$${settings.balance}**\n` +
          `• ⚖️ درصد ریسک هر معامله: **${settings.riskPercent}%**\n` +
          `• 📚 استراتژی: **${settings.strategy}**\n` +
          `• 🔔 شکارچی خودکار: **${settings.autoHunterEnabled ? "✅ روشن" : "❌ خاموش"}**\n\n` +
          `جهت تغییر تنظیمات، گزینه‌های زیر را لمس کنید:`;
        
        await sendTelegramMessage(token, chatId.toString(), timingMsg, {
          inlineKeyboard: [
            [
              { text: "🛡️ تغییر پروفایل ریسک", callback_data: "/menu_risk" },
              { text: "⏱️ تغییر تایم‌فریم", callback_data: "/menu_timeframe" }
            ],
            [
              { text: "🧠 تغییر موتور تحلیلی", callback_data: "/menu_engine" },
              { text: "📚 تغییر استراتژی", callback_data: "/menu_strategy" }
            ],
            [
              { text: "💵 تنظیم سرمایه", callback_data: "/menu_balance" },
              { text: "⚖️ تنظیم درصد ریسک", callback_data: "/menu_risk_percent" }
            ],
            [
              { text: "🔔 مدیریت شکارچی خودکار", callback_data: "/menu_hunter" },
              { text: "🔙 منوی اصلی", callback_data: "/main_menu" }
            ],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_risk") {
        await sendTelegramMessage(token, chatId.toString(), `🛡️ **انتخاب پروفایل سوددهی و مدیریت ریسک:**\n\n1️⃣ **کم‌ریسک (Conservative)**: لوریج 3x-5x | ریسک ۱٪\n2️⃣ **متعادل (Moderate)**: لوریج 10x-15x | ریسک ۲٪\n3️⃣ **تهاجمی (Aggressive)**: لوریج 20x-30x | اسکلپ پربازده`, {
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
        updateChatSettings(chatId, { riskProfile: profile as any });
        const label = profile === 'conservative' ? '🛡️ کم‌ریسک' : profile === 'aggressive' ? '🚀 تهاجمی' : '⚖️ متعادل';
        await sendTelegramMessage(token, chatId.toString(), `✅ پروفایل ریسک شما با موفقیت به **${label}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_timeframe") {
        await sendTelegramMessage(token, chatId.toString(), `⏱️ **تایم‌فریم پیش‌فرض برای تحلیل خودکار را انتخاب کنید:**`, {
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
        await sendTelegramMessage(token, chatId.toString(), `✅ تایم‌فریم پیش‌فرض به **${tf}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_engine") {
        await sendTelegramMessage(token, chatId.toString(), `🧠 **موتور تولید ستاپ معاملاتی را انتخاب کنید:**\n\n• **هوش مصنوعی آنلاین:** استفاده از قابلیت تحلیل زنده Gemini AI\n• **قوانین و استراتژی آفلاین:** الگوریتم‌های ثابت SMC به صورت محلی و سریع بدون نیاز به اینترنت`, {
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
        await sendTelegramMessage(token, chatId.toString(), `✅ موتور تحلیل به **🧠 هوش مصنوعی آنلاین** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/set_engine_offline") {
        updateChatSettings(chatId, { engineMode: 'OFFLINE_RULES' });
        await sendTelegramMessage(token, chatId.toString(), `✅ موتور تحلیل به **📚 قوانین و استراتژی آفلاین SMC** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_strategy") {
        await sendTelegramMessage(token, chatId.toString(), `📚 **استراتژی پیش‌فرض تحلیل تکنیکال را انتخاب کنید:**`, {
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
        await sendTelegramMessage(token, chatId.toString(), `✅ استراتژی معاملاتی به **${label}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_balance") {
        await sendTelegramMessage(token, chatId.toString(), `💵 **تنظیم موجودی حساب معاملاتی**\n\nبرای تنظیم سرمایه دلاری خود، لطفا دستور زیر را بنویسید و ارسال کنید:\n\n\`/set_balance [مقدار دلاری]\`\n\nمثال: \`/set_balance 2500\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_risk_percent") {
        await sendTelegramMessage(token, chatId.toString(), `⚖️ **تنظیم درصد ریسک هر معامله**\n\nبرای تنظیم درصد ریسک مجاز در هر پوزیشن، لطفا دستور زیر را ارسال کنید:\n\n\`/set_risk_percent [درصد]\`\n\nمثال: \`/set_risk_percent 1.5\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_hunter") {
        const wl = settings.watchlist || [];
        await sendTelegramMessage(token, chatId.toString(), `🔔 **تنظیمات شکارچی خودکار (Auto Pilot AI Hunter)**\n\n` +
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
        await sendTelegramMessage(token, chatId.toString(), `✅ وضعیت شکارچی خودکار با موفقیت به **${newVal ? "روشن 🟢" : "خاموش 🔴"}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/menu_hunter" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/hunter_add") {
        await sendTelegramMessage(token, chatId.toString(), `➕ **افزودن نماد به لیست شکارچی خودکار**\n\nلطفا دستور زیر را بفرستید:\n\n\`/add_watchlist [نام نماد]\`\n\nمثال: \`/add_watchlist SOLUSDT\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت", callback_data: "/menu_hunter" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/hunter_remove") {
        await sendTelegramMessage(token, chatId.toString(), `➖ **حذف نماد از لیست شکارچی خودکار**\n\nلطفا دستور زیر را بفرستید:\n\n\`/remove_watchlist [نام نماد]\`\n\nمثال: \`/remove_watchlist TSLA\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت", callback_data: "/menu_hunter" }]],
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
          await sendTelegramMessage(token, chatId.toString(), `❌ پارامترهای ستاپ یافت نشد.`, { replyKeyboard: mainReplyMenu });
        } else {
          const calcText = performPositionCalculation(settings.balance, settings.riskPercent, entry, sl, symbol);
          await sendTelegramMessage(token, chatId.toString(), calcText, {
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
        await sendTelegramMessage(token, chatId.toString(), `❌ موجودی نامعتبر است. فرمت صحیح:\n\`/set_balance 1500\``, { replyKeyboard: mainReplyMenu });
      } else {
        updateChatSettings(chatId, { balance: val });
        await sendTelegramMessage(token, chatId.toString(), `✅ موجودی حساب شما با موفقیت روی **$${val.toLocaleString()}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
      }
      return;
    }

    if (text.startsWith("/set_risk_percent")) {
      const val = parseFloat(text.replace("/set_risk_percent", "").trim());
      if (isNaN(val) || val <= 0 || val > 100) {
        await sendTelegramMessage(token, chatId.toString(), `❌ درصد ریسک نامعتبر است. فرمت صحیح:\n\`/set_risk_percent 2\``, { replyKeyboard: mainReplyMenu });
      } else {
        updateChatSettings(chatId, { riskPercent: val });
        await sendTelegramMessage(token, chatId.toString(), `✅ درصد ریسک معاملات شما روی **${val}%** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
      }
      return;
    }

    if (text.startsWith("/add_watchlist")) {
      const symbol = text.replace("/add_watchlist", "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!symbol) {
        await sendTelegramMessage(token, chatId.toString(), `❌ نام نماد خالی است.`, { replyKeyboard: mainReplyMenu });
      } else {
        const wl = settings.watchlist || [];
        if (wl.includes(symbol)) {
          await sendTelegramMessage(token, chatId.toString(), `⚠️ نماد #${symbol} از قبل در دیده‌بان شما موجود است.`, { replyKeyboard: mainReplyMenu });
        } else {
          updateChatSettings(chatId, { watchlist: [...wl, symbol] });
          await sendTelegramMessage(token, chatId.toString(), `✅ نماد **#${symbol}** به دیده‌بان شکارچی خودکار شما افزوده شد.`, {
            inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/menu_hunter" }]],
            replyKeyboard: mainReplyMenu,
          });
        }
      }
      return;
    }

    if (text.startsWith("/remove_watchlist")) {
      const symbol = text.replace("/remove_watchlist", "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!symbol) {
        await sendTelegramMessage(token, chatId.toString(), `❌ نام نماد خالی است.`, { replyKeyboard: mainReplyMenu });
      } else {
        const wl = settings.watchlist || [];
        if (!wl.includes(symbol)) {
          await sendTelegramMessage(token, chatId.toString(), `⚠️ نماد #${symbol} در دیده‌بان شما یافت نشد.`, { replyKeyboard: mainReplyMenu });
        } else {
          updateChatSettings(chatId, { watchlist: wl.filter(s => s !== symbol) });
          await sendTelegramMessage(token, chatId.toString(), `✅ نماد **#${symbol}** از دیده‌بان شکارچی خودکار شما حذف شد.`, {
            inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/menu_hunter" }]],
            replyKeyboard: mainReplyMenu,
          });
        }
      }
      return;
    }

    if (text.startsWith("/calc")) {
      const rawArgs = text.replace("/calc", "").trim();
      const parts = rawArgs.split(/\s+/);
      if (!rawArgs) {
        const calcMsg = `🧮 **ماشین‌حساب هوشمند مدیریت سرمایه و مارجین**\n\nبرای محاسبه دقیق حجم ورود:\nدستور را به شکل زیر بفرستید:\n\n\`/calc [سرمایه] [درصد ریسک] [قیمت ورود] [استاپ‌لاس]\`\n\nمثال: \`/calc 1000 2 68000 66500\`\n\nیا ستاپ اختصاصی با جزییات ذخیره شده:\n\`/calc [نماد] [قیمت ورود] [استاپ‌لاس]\`\nمثال: \`/calc BTCUSDT 95400 94100\``;
        await sendTelegramMessage(token, chatId.toString(), calcMsg, {
          inlineKeyboard: [[{ text: "📊 محاسبه BTC پیش‌فرض", callback_data: "/calc_setup BTCUSDT 96000 94500" }]],
          replyKeyboard: mainReplyMenu,
        });
      } else if (parts.length === 4) {
        const bal = parseFloat(parts[0]);
        const risk = parseFloat(parts[1]);
        const entry = parseFloat(parts[2]);
        const sl = parseFloat(parts[3]);
        if (isNaN(bal) || isNaN(risk) || isNaN(entry) || isNaN(sl)) {
          await sendTelegramMessage(token, chatId.toString(), `❌ پارامترها نامعتبر هستند.`, { replyKeyboard: mainReplyMenu });
        } else {
          const resText = performPositionCalculation(bal, risk, entry, sl, "CUSTOM");
          await sendTelegramMessage(token, chatId.toString(), resText, { replyKeyboard: mainReplyMenu });
        }
      } else if (parts.length === 3) {
        const sym = parts[0].toUpperCase();
        const entry = parseFloat(parts[1]);
        const sl = parseFloat(parts[2]);
        if (isNaN(entry) || isNaN(sl)) {
          await sendTelegramMessage(token, chatId.toString(), `❌ قیمت‌های وارد شده نامعتبر هستند.`, { replyKeyboard: mainReplyMenu });
        } else {
          const resText = performPositionCalculation(settings.balance, settings.riskPercent, entry, sl, sym);
          await sendTelegramMessage(token, chatId.toString(), resText, { replyKeyboard: mainReplyMenu });
        }
      } else {
        await sendTelegramMessage(token, chatId.toString(), `❌ فرمت دستور نادرست است.`, { replyKeyboard: mainReplyMenu });
      }
      return;
    }

    if (text === "/start" || text === "شروع" || text === "سلام" || text === "/main_menu") {
      const welcome = `👋 **سلام! به بات تریدینگ‌ویو، تحلیل تکنیکال و سیگنال‌های دوگانه (هوش مصنوعی + دانش آفلاین) خوش آمدید.**

سیستم دارای دو موتور تولید ستاپ معاملاتی است:
🧠 **۱. هوش مصنوعی آنلاین:** تحلیل بلادرنگ و مولتی‌مدال پرایس اکشن
📚 **۲. دانش و استراتژی آفلاین:** الگوریتم قوانین ثابت اسمارت‌مانی (SMC)، اردربلاک، هانت نقدینگی و فیبوناچی

امکانات پنل به صورت **دکمه‌های شیشه‌ای** و **منوی زیر چت** در دسترس است:`;
      await sendTelegramMessage(token, chatId.toString(), welcome, {
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
            { text: "🔔 شکار خودکار فرصت‌ها", callback_data: "/auto_hunter" },
            { text: "🧮 محاسبه‌گر حجم", callback_data: "/calc" },
          ],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "🧠 تحلیل هوش مصنوعی") {
      await sendTelegramMessage(token, chatId.toString(), "🧠 **تحلیل با هوش مصنوعی آنلاین (Gemini AI):**\nیک دارایی را انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m ONLINE_AI" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m ONLINE_AI" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h ONLINE_AI" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "📚 دانش و استراتژی آفلاین") {
      await sendTelegramMessage(token, chatId.toString(), "📚 **تحلیل با متدولوژی و دانش آفلاین (Smart Money Concepts & Rules):**\nدارایی مورد نظر را انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m OFFLINE_RULES" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m OFFLINE_RULES" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h OFFLINE_RULES" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "📊 تحلیل فوری ارزها") {
      await sendTelegramMessage(token, chatId.toString(), "🔍 ارز یا دارایی مورد نظرتان را انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h" }],
          [{ text: "🟢 سهام انویدیا (NVDA)", callback_data: "/analyze NVDA 1h" }, { text: "🐕 دوج‌کوین (DOGE)", callback_data: "/analyze DOGEUSDT 15m" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "🎯 اسکنر هوشمند بازار") {
      const setups = await Promise.all(
        POPULAR_MARKETS.slice(0, 3).map(async (m) => {
          const md = await fetchLiveMarketData(m.symbol);
          return generateAITradingAnalysis({
            symbol: m.symbol,
            timeframe: settings.timeframe,
            engineMode: settings.engineMode,
            riskSettings: { profile: settings.riskProfile, maxRiskPercent: settings.riskPercent }
          }, md);
        })
      );
      const scanText = `🎯 **اسکنر بازار تریدینگ‌ویو (ستاپ‌های فعال)**\n\n` +
        setups.map(s => `🔹 **#${s.symbol}**: ${s.action === "LONG" ? "🟢 لانگ" : "🔴 شورت"} | قیمت فعلی: $${s.currentPrice} | ورود: $${s.optimalEntry} | TP1: $${s.takeProfits[0]?.price}`).join("\n\n");
      await sendTelegramMessage(token, chatId.toString(), scanText, {
        inlineKeyboard: setups.map(s => [{ text: `🚀 دریافت ستاپ ${s.symbol}`, callback_data: `/analyze ${s.symbol}` }]),
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "⚙️ تنظیمات ریسک و سود") {
      await handleTelegramUpdate(token, { callback_query: { message: { chat: { id: chatId } }, data: "/settings_risk" } });
    } else if (text === "🧮 محاسبه حجم و مارجین") {
      await handleTelegramUpdate(token, { message: { chat: { id: chatId }, text: "/calc" } });
    } else if (text === "🔔 شکار خودکار فرصت‌ها") {
      await handleTelegramUpdate(token, { callback_query: { message: { chat: { id: chatId } }, data: "/menu_hunter" } });
    } else if (text === "⚖️ قوانین و سلب مسئولیت حقوقی") {
      await sendTelegramMessage(token, chatId.toString(), legalRulesMessage, {
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
          riskSettings: { profile: settings.riskProfile, maxRiskPercent: settings.riskPercent }
        }, marketData);
        
        await sendTelegramMessage(token, chatId.toString(), setup.telegramMessage, {
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
        await sendTelegramMessage(token, chatId.toString(), `❌ نماد یا دارایی **"${symbol}"** یافت نشد یا در پردازش آن خطایی رخ داد.`, { replyKeyboard: mainReplyMenu });
      }
    }
  } catch (err) {
    console.error("Unified Telegram handler error:", err);
  }
}

export async function handleBaleUpdate(token: string, update: any) {
  try {
    const message = update?.message;
    const callbackQuery = update?.callback_query;
    
    const baleLegalRulesMessage = `⚖️ **قوانین و سلب مسئولیت حقوقی ربات تریدینگ‌ویو (بله)**

۱. 👤 **مسئولیت کامل ۱۰۰٪ با کاربر:**
کلیه ستاپ‌ها و نقاط ورود صرفاً خروجی هوش مصنوعی و جنبه آموزشی دارد. تصمیم‌گیری نهایی و مسئولیت سود یا زیان در بازار با خود کاربر است.

۲. 🚫 **عدم نفع مالی سازنده (Zero Gain):**
هیچ درصدی از معاملات شما به سازنده تعلق نمی‌گیرد و سازنده هیچ سهمی در گردش مالی شما ندارد.

۳. 🌍 **پوشش کلیه بازارهای تریدینگ‌ویو:**
شامل ارزهای دیجیتال (Crypto)، فارکس (Forex)، انس طلا (Gold) و سهام بین‌المللی.

۴. 🛡️ **مدیریت ریسک:**
تعیین حد ضرر (Stop Loss) و مدیریت حداکثر ۲٪ ریسک در هر معامله الزامی است.`;

    const mainReplyMenu = [
      [{ text: "📊 تحلیل فوری ارزها" }, { text: "🎯 اسکنر هوشمند بازار" }],
      [{ text: "🧠 تحلیل هوش مصنوعی" }, { text: "📚 دانش و استراتژی آفلاین" }],
      [{ text: "⚙️ تنظیمات ریسک و سود" }, { text: "🧮 محاسبه حجم و مارجین" }],
      [{ text: "🔔 شکار خودکار فرصت‌ها" }, { text: "⚖️ قوانین و سلب مسئولیت حقوقی" }],
    ];

    if (callbackQuery) {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      const settings = getChatSettings(chatId);
      
      if (data === "/rules" || data === "/disclaimer") {
        await sendBaleMessage(token, chatId.toString(), baleLegalRulesMessage, {
          inlineKeyboard: [
            [{ text: "🎯 اسکنر بازار", callback_data: "/scanner" }],
            [{ text: "🔙 منوی اصلی", callback_data: "/main_menu" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }
      
      if (data === "/main_menu") {
        const welcome = `👋 سلام به ربات هوشمند تریدینگ‌ویو (بله) با دو موتور تحلیلی آنلاین و آفلاین خوش آمدید!\n\n🧠 ۱. هوش مصنوعی آنلاین (Gemini AI)\n📚 ۲. دانش و استراتژی آفلاین (SMC Rules)\n\nگزینه مورد نظر را انتخاب کنید:`;
        await sendBaleMessage(token, chatId.toString(), welcome, {
          inlineKeyboard: [
            [{ text: "🧠 تحلیل هوش مصنوعی بیتکوین", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" }],
            [{ text: "📚 ستاپ آفلاین اسمارت‌مانی BTC", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" }],
            [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
            [{ text: "⚖️ قوانین و سلب مسئولیت", callback_data: "/rules" }],
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
          timeHorizon: timeHorizon as any,
          riskSettings: {
            profile: settings.riskProfile,
            maxRiskPercent: settings.riskPercent,
          }
        }, marketData);
        
        await sendBaleMessage(token, chatId.toString(), setup.baleMessage, {
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
              riskSettings: { profile: settings.riskProfile, maxRiskPercent: settings.riskPercent }
            }, md);
          })
        );
        const text = `🎯 **اسکن فوری برترین فرصت‌های بازار** 🎯\n\n` +
          setups.map(s => `🔹 **${s.symbol}**: جهت ${s.action === "LONG" ? "🟢 لانگ" : "🔴 شورت"} | ورود: $${s.optimalEntry} | تارگت: $${s.takeProfits[0]?.price}`).join("\n\n");
        await sendBaleMessage(token, chatId.toString(), text, {
          inlineKeyboard: setups.map(s => [{ text: `📊 دریافت ستاپ کامل ${s.symbol}`, callback_data: `/analyze ${s.symbol}` }]),
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/settings_risk") {
        const profileFa = settings.riskProfile === 'conservative' ? '🛡️ کم‌ریسک' : settings.riskProfile === 'aggressive' ? '🚀 تهاجمی' : '⚖️ متعادل';
        const engineFa = settings.engineMode === 'ONLINE_AI' ? '🧠 هوش مصنوعی آنلاین' : '📚 دانش آفلاین SMC';
        const timingMsg = `⚙️ **تنظیمات کاربری ربات تریدینگ‌ویو (بله)** ⚙️\n\n` +
          `📊 **تنظیمات فعلی شما:**\n` +
          `• 🛡️ پروفایل ریسک: **${profileFa}**\n` +
          `• ⏱️ تایم‌فریم پیش‌فرض: **${settings.timeframe}**\n` +
          `• 🧠 موتور تحلیلی: **${engineFa}**\n` +
          `• 💵 سرمایه معاملاتی: **$${settings.balance}**\n` +
          `• ⚖️ درصد ریسک هر معامله: **${settings.riskPercent}%**\n` +
          `• 📚 استراتژی: **${settings.strategy}**\n` +
          `• 🔔 شکارچی خودکار: **${settings.autoHunterEnabled ? "✅ روشن" : "❌ خاموش"}**\n\n` +
          `جهت تغییر تنظیمات، گزینه‌های زیر را لمس کنید:`;
        
        await sendBaleMessage(token, chatId.toString(), timingMsg, {
          inlineKeyboard: [
            [
              { text: "🛡️ تغییر پروفایل ریسک", callback_data: "/menu_risk" },
              { text: "⏱️ تغییر تایم‌فریم", callback_data: "/menu_timeframe" }
            ],
            [
              { text: "🧠 تغییر موتور تحلیلی", callback_data: "/menu_engine" },
              { text: "📚 تغییر استراتژی", callback_data: "/menu_strategy" }
            ],
            [
              { text: "💵 تنظیم سرمایه", callback_data: "/menu_balance" },
              { text: "⚖️ تنظیم درصد ریسک", callback_data: "/menu_risk_percent" }
            ],
            [
              { text: "🔔 مدیریت شکارچی خودکار", callback_data: "/menu_hunter" },
              { text: "🔙 منوی اصلی", callback_data: "/main_menu" }
            ],
          ],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_risk") {
        await sendBaleMessage(token, chatId.toString(), `🛡️ **انتخاب پروفایل سوددهی و مدیریت ریسک:**\n\n1️⃣ **کم‌ریسک (Conservative)**: لوریج 3x-5x | ریسک ۱٪\n2️⃣ **متعادل (Moderate)**: لوریج 10x-15x | ریسک ۲٪\n3️⃣ **تهاجمی (Aggressive)**: لوریج 20x-30x | اسکلپ پربازده`, {
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
        updateChatSettings(chatId, { riskProfile: profile as any });
        const label = profile === 'conservative' ? '🛡️ کم‌ریسک' : profile === 'aggressive' ? '🚀 تهاجمی' : '⚖️ متعادل';
        await sendBaleMessage(token, chatId.toString(), `✅ پروفایل ریسک شما با موفقیت به **${label}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_timeframe") {
        await sendBaleMessage(token, chatId.toString(), `⏱️ **تایم‌فریم پیش‌فرض برای تحلیل خودکار را انتخاب کنید:**`, {
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
        await sendBaleMessage(token, chatId.toString(), `✅ تایم‌فریم پیش‌فرض به **${tf}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_engine") {
        await sendBaleMessage(token, chatId.toString(), `🧠 **موتور تولید ستاپ معاملاتی را انتخاب کنید:**\n\n• **هوش مصنوعی آنلاین:** استفاده از قابلیت تحلیل زنده Gemini AI\n• **قوانین و استراتژی آفلاین:** الگوریتم‌های ثابت SMC به صورت محلی و سریع بدون نیاز به اینترنت`, {
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
        await sendBaleMessage(token, chatId.toString(), `✅ موتور تحلیل به **🧠 هوش مصنوعی آنلاین** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/set_engine_offline") {
        updateChatSettings(chatId, { engineMode: 'OFFLINE_RULES' });
        await sendBaleMessage(token, chatId.toString(), `✅ موتور تحلیل به **📚 قوانین و استراتژی آفلاین SMC** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_strategy") {
        await sendBaleMessage(token, chatId.toString(), `📚 **استراتژی پیش‌فرض تحلیل تکنیکال را انتخاب کنید:**`, {
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
        await sendBaleMessage(token, chatId.toString(), `✅ استراتژی معاملاتی به **${label}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_balance") {
        await sendBaleMessage(token, chatId.toString(), `💵 **تنظیم موجودی حساب معاملاتی**\n\nبرای تنظیم سرمایه دلاری خود، لطفا دستور زیر را بنویسید و ارسال کنید:\n\n\`/set_balance [مقدار دلاری]\`\n\nمثال: \`/set_balance 2500\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_risk_percent") {
        await sendBaleMessage(token, chatId.toString(), `⚖️ **تنظیم درصد ریسک هر معامله**\n\nبرای تنظیم درصد ریسک مجاز در هر پوزیشن، لطفا دستور زیر را ارسال کنید:\n\n\`/set_risk_percent [درصد]\`\n\nمثال: \`/set_risk_percent 1.5\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/menu_hunter") {
        const wl = settings.watchlist || [];
        await sendBaleMessage(token, chatId.toString(), `🔔 **تنظیمات شکارچی خودکار (بله)**\n\n` +
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
        await sendBaleMessage(token, chatId.toString(), `✅ وضعیت شکارچی خودکار با موفقیت به **${newVal ? "روشن 🟢" : "خاموش 🔴"}** تغییر یافت.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/menu_hunter" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/hunter_add") {
        await sendBaleMessage(token, chatId.toString(), `➕ **افزودن نماد به لیست شکارچی خودکار**\n\nلطفا دستور زیر را بفرستید:\n\n\`/add_watchlist [نام نماد]\`\n\nمثال: \`/add_watchlist SOLUSDT\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت", callback_data: "/menu_hunter" }]],
          replyKeyboard: mainReplyMenu,
        });
        return;
      }

      if (data === "/hunter_remove") {
        await sendBaleMessage(token, chatId.toString(), `➖ **حذف نماد از لیست شکارچی خودکار**\n\nلطفا دستور زیر را بفرستید:\n\n\`/remove_watchlist [نام نماد]\`\n\nمثال: \`/remove_watchlist TSLA\``, {
          inlineKeyboard: [[{ text: "🔙 بازگشت", callback_data: "/menu_hunter" }]],
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
          await sendBaleMessage(token, chatId.toString(), `❌ پارامترهای ستاپ یافت نشد.`, { replyKeyboard: mainReplyMenu });
        } else {
          const calcText = performPositionCalculation(settings.balance, settings.riskPercent, entry, sl, symbol);
          await sendBaleMessage(token, chatId.toString(), calcText, {
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
        await sendBaleMessage(token, chatId.toString(), `❌ موجودی نامعتبر است. فرمت صحیح:\n\`/set_balance 1500\``, { replyKeyboard: mainReplyMenu });
      } else {
        updateChatSettings(chatId, { balance: val });
        await sendBaleMessage(token, chatId.toString(), `✅ موجودی حساب شما با موفقیت روی **$${val.toLocaleString()}** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
      }
      return;
    }

    if (text.startsWith("/set_risk_percent")) {
      const val = parseFloat(text.replace("/set_risk_percent", "").trim());
      if (isNaN(val) || val <= 0 || val > 100) {
        await sendBaleMessage(token, chatId.toString(), `❌ درصد ریسک نامعتبر است. فرمت صحیح:\n\`/set_risk_percent 2\``, { replyKeyboard: mainReplyMenu });
      } else {
        updateChatSettings(chatId, { riskPercent: val });
        await sendBaleMessage(token, chatId.toString(), `✅ درصد ریسک معاملات شما روی **${val}%** تنظیم شد.`, {
          inlineKeyboard: [[{ text: "🔙 بازگشت به تنظیمات", callback_data: "/settings_risk" }]],
          replyKeyboard: mainReplyMenu,
        });
      }
      return;
    }

    if (text.startsWith("/add_watchlist")) {
      const symbol = text.replace("/add_watchlist", "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!symbol) {
        await sendBaleMessage(token, chatId.toString(), `❌ نام نماد خالی است.`, { replyKeyboard: mainReplyMenu });
      } else {
        const wl = settings.watchlist || [];
        if (wl.includes(symbol)) {
          await sendBaleMessage(token, chatId.toString(), `⚠️ نماد #${symbol} از قبل در دیده‌بان شما موجود است.`, { replyKeyboard: mainReplyMenu });
        } else {
          updateChatSettings(chatId, { watchlist: [...wl, symbol] });
          await sendBaleMessage(token, chatId.toString(), `✅ نماد **#${symbol}** به دیده‌بان شکارچی خودکار شما افزوده شد.`, {
            inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/menu_hunter" }]],
            replyKeyboard: mainReplyMenu,
          });
        }
      }
      return;
    }

    if (text.startsWith("/remove_watchlist")) {
      const symbol = text.replace("/remove_watchlist", "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!symbol) {
        await sendBaleMessage(token, chatId.toString(), `❌ نام نماد خالی است.`, { replyKeyboard: mainReplyMenu });
      } else {
        const wl = settings.watchlist || [];
        if (!wl.includes(symbol)) {
          await sendBaleMessage(token, chatId.toString(), `⚠️ نماد #${symbol} در دیده‌بان شما یافت نشد.`, { replyKeyboard: mainReplyMenu });
        } else {
          updateChatSettings(chatId, { watchlist: wl.filter(s => s !== symbol) });
          await sendBaleMessage(token, chatId.toString(), `✅ نماد **#${symbol}** از دیده‌بان شکارچی خودکار شما حذف شد.`, {
            inlineKeyboard: [[{ text: "🔙 بازگشت به دیده‌بان", callback_data: "/menu_hunter" }]],
            replyKeyboard: mainReplyMenu,
          });
        }
      }
      return;
    }

    if (text.startsWith("/calc")) {
      const rawArgs = text.replace("/calc", "").trim();
      const parts = rawArgs.split(/\s+/);
      if (!rawArgs) {
        const calcMsg = `🧮 **ماشین‌حساب هوشمند مدیریت سرمایه و مارجین**\n\nبرای محاسبه دقیق حجم ورود:\nدستور را به شکل زیر بفرستید:\n\n\`/calc [سرمایه] [درصد ریسک] [قیمت ورود] [استاپ‌لاس]\`\n\nمثال: \`/calc 1000 2 68000 66500\`\n\nیا ستاپ اختصاصی با جزییات ذخیره شده:\n\`/calc [نماد] [قیمت ورود] [استاپ‌لاس]\`\nمثال: \`/calc BTCUSDT 95400 94100\``;
        await sendBaleMessage(token, chatId.toString(), calcMsg, {
          inlineKeyboard: [[{ text: "📊 محاسبه BTC پیش‌فرض", callback_data: "/calc_setup BTCUSDT 96000 94500" }]],
          replyKeyboard: mainReplyMenu,
        });
      } else if (parts.length === 4) {
        const bal = parseFloat(parts[0]);
        const risk = parseFloat(parts[1]);
        const entry = parseFloat(parts[2]);
        const sl = parseFloat(parts[3]);
        if (isNaN(bal) || isNaN(risk) || isNaN(entry) || isNaN(sl)) {
          await sendBaleMessage(token, chatId.toString(), `❌ پارامترها نامعتبر هستند.`, { replyKeyboard: mainReplyMenu });
        } else {
          const resText = performPositionCalculation(bal, risk, entry, sl, "CUSTOM");
          await sendBaleMessage(token, chatId.toString(), resText, { replyKeyboard: mainReplyMenu });
        }
      } else if (parts.length === 3) {
        const sym = parts[0].toUpperCase();
        const entry = parseFloat(parts[1]);
        const sl = parseFloat(parts[2]);
        if (isNaN(entry) || isNaN(sl)) {
          await sendBaleMessage(token, chatId.toString(), `❌ قیمت‌های وارد شده نامعتبر هستند.`, { replyKeyboard: mainReplyMenu });
        } else {
          const resText = performPositionCalculation(settings.balance, settings.riskPercent, entry, sl, sym);
          await sendBaleMessage(token, chatId.toString(), resText, { replyKeyboard: mainReplyMenu });
        }
      } else {
        await sendBaleMessage(token, chatId.toString(), `❌ فرمت دستور نادرست است.`, { replyKeyboard: mainReplyMenu });
      }
      return;
    }

    if (text === "/start" || text === "شروع" || text === "سلام" || text === "/main_menu") {
      const welcome = `👋 سلام به ربات هوشمند تریدینگ‌ویو (بله) با دو موتور تحلیلی آنلاین و آفلاین خوش آمدید!\n\n🧠 ۱. هوش مصنوعی آنلاین (Gemini AI)\n📚 ۲. دانش و استراتژی آفلاین (SMC Rules)\n\nگزینه مورد نظر را انتخاب کنید:`;
      await sendBaleMessage(token, chatId.toString(), welcome, {
        inlineKeyboard: [
          [{ text: "🧠 تحلیل هوش مصنوعی بیتکوین", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" }],
          [{ text: "📚 ستاپ آفلاین اسمارت‌مانی BTC", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" }],
          [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
          [{ text: "⚖️ قوانین و سلب مسئولیت", callback_data: "/rules" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "🧠 تحلیل هوش مصنوعی") {
      await sendBaleMessage(token, chatId.toString(), "🧠 یک دارایی را برای تحلیل هوش مصنوعی انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m ONLINE_AI" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m ONLINE_AI" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m ONLINE_AI" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "📚 دانش و استراتژی آفلاین") {
      await sendBaleMessage(token, chatId.toString(), "📚 یک دارایی را برای بررسی با استراتژی و دانش آفلاین SMC انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m OFFLINE_RULES" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m OFFLINE_RULES" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m OFFLINE_RULES" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "📊 تحلیل فوری ارزها") {
      await sendBaleMessage(token, chatId.toString(), "🔍 ارز یا دارایی مورد نظرتان را انتخاب کنید:", {
        inlineKeyboard: [
          [{ text: "🟡 بیتکوین (BTC)", callback_data: "/analyze BTCUSDT 15m" }, { text: "🔷 اتریوم (ETH)", callback_data: "/analyze ETHUSDT 15m" }],
          [{ text: "🟣 سولانا (SOL)", callback_data: "/analyze SOLUSDT 15m" }, { text: "👑 انس طلا (XAU)", callback_data: "/analyze XAUUSD 1h" }],
        ],
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "🎯 اسکنر هوشمند بازار") {
      const setups = await Promise.all(
        POPULAR_MARKETS.slice(0, 3).map(async (m) => {
          const md = await fetchLiveMarketData(m.symbol);
          return generateAITradingAnalysis({
            symbol: m.symbol,
            timeframe: settings.timeframe,
            engineMode: settings.engineMode,
            riskSettings: { profile: settings.riskProfile, maxRiskPercent: settings.riskPercent }
          }, md);
        })
      );
      const scanText = `🎯 **اسکنر بازار تریدینگ‌ویو**\n\n` +
        setups.map(s => `▪️ #${s.symbol}: ${s.action === "LONG" ? "خرید لانگ" : "فروش شورت"} | ورود: $${s.optimalEntry} | TP1: $${s.takeProfits[0]?.price}`).join("\n\n");
      await sendBaleMessage(token, chatId.toString(), scanText, {
        inlineKeyboard: setups.map(s => [{ text: `تحلیل کامل ${s.symbol}`, callback_data: `/analyze ${s.symbol}` }]),
        replyKeyboard: mainReplyMenu,
      });
    } else if (text === "⚙️ تنظیمات ریسک و سود") {
      await handleBaleUpdate(token, { callback_query: { message: { chat: { id: chatId } }, data: "/settings_risk" } });
    } else if (text === "🧮 محاسبه حجم و مارجین") {
      await handleBaleUpdate(token, { message: { chat: { id: chatId }, text: "/calc" } });
    } else if (text === "🔔 شکار خودکار فرصت‌ها") {
      await handleBaleUpdate(token, { callback_query: { message: { chat: { id: chatId } }, data: "/menu_hunter" } });
    } else if (text === "⚖️ قوانین و سلب مسئولیت حقوقی") {
      await sendBaleMessage(token, chatId.toString(), baleLegalRulesMessage, {
        inlineKeyboard: [
          [{ text: "🎯 اسکنر بازار", callback_data: "/scanner" }],
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
          riskSettings: { profile: settings.riskProfile, maxRiskPercent: settings.riskPercent }
        }, marketData);
        
        await sendBaleMessage(token, chatId.toString(), setup.baleMessage, {
          inlineKeyboard: [
            [
              { text: `🧠 بررسی هوش مصنوعی`, callback_data: `/analyze ${symbol} ${tf} ONLINE_AI` },
              { text: `📚 دانش آفلاین SMC`, callback_data: `/analyze ${symbol} ${tf} OFFLINE_RULES` },
            ],
            [{ text: "🎯 اسکنر بازار", callback_data: "/scanner" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      } catch (err) {
        await sendBaleMessage(token, chatId.toString(), `❌ نماد **"${symbol}"** یافت نشد یا در پردازش آن خطایی رخ داد.`, { replyKeyboard: mainReplyMenu });
      }
    }
  } catch (err) {
    console.error("Unified Bale handler error:", err);
  }
}

let currentTelegramTokenForPolling = "";
export async function startTelegramPollingLoop() {
  const config = getGlobalConfig();
  const token = config.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  
  if (currentTelegramTokenForPolling === token) return;
  currentTelegramTokenForPolling = token;
  
  console.log(`[Telegram Bot] Starting long-polling with token: ${token.substring(0, 8)}...`);
  
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: "POST" });
  } catch {}
  
  let offset = 0;
  while (currentTelegramTokenForPolling === token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`);
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      const data: any = await res.json();
      if (data.ok && data.result?.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleTelegramUpdate(token, update);
        }
      }
    } catch (err) {
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

let currentBaleTokenForPolling = "";
export async function startBalePollingLoop() {
  const config = getGlobalConfig();
  const token = config.baleToken || process.env.BALE_BOT_TOKEN;
  if (!token) return;
  
  if (currentBaleTokenForPolling === token) return;
  currentBaleTokenForPolling = token;
  
  console.log(`[Bale Bot] Starting long-polling with token: ${token.substring(0, 8)}...`);
  
  try {
    await fetch(`https://tapi.bale.ai/bot${token}/deleteWebhook`, { method: "POST" });
  } catch {}
  
  let offset = 0;
  while (currentBaleTokenForPolling === token) {
    try {
      const res = await fetch(`https://tapi.bale.ai/bot${token}/getUpdates?offset=${offset}&timeout=20`);
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      const data: any = await res.json();
      if (data.ok && data.result?.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleBaleUpdate(token, update);
        }
      }
    } catch (err) {
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

export function startBackgroundHunter() {
  setInterval(async () => {
    try {
      const config = getGlobalConfig();
      const tgToken = config.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
      const baleToken = config.baleToken || process.env.BALE_BOT_TOKEN;
      
      const chats = Object.keys(settingsStore);
      for (const chatId of chats) {
        if (chatId === "__global_config__") continue;
        const settings = settingsStore[chatId];
        if (settings.autoHunterEnabled) {
          const watchlist = settings.watchlist || [];
          for (const symbol of watchlist.slice(0, 6)) {
            try {
              const marketData = await fetchLiveMarketData(symbol);
              const setup = await generateAITradingAnalysis({
                symbol,
                timeframe: settings.timeframe,
                engineMode: settings.engineMode,
                strategy: settings.strategy,
                riskSettings: {
                  profile: settings.riskProfile,
                  maxRiskPercent: settings.riskPercent,
                }
              }, marketData);
              
              if ((setup.grade === "A+" || setup.grade === "A") && setup.action !== "WAIT") {
                const cacheKey = `${chatId}_${symbol}_${setup.action}_${setup.grade}`;
                const lastSent = hunterAlertCache.get(cacheKey);
                if (!lastSent || Date.now() - lastSent > 2 * 60 * 60 * 1000) {
                  hunterAlertCache.set(cacheKey, Date.now());
                  
                  const alertMsg = `🔔 **[شکارچی خودکار - ستاپ A+ شکار شد]**\n\n` + setup.telegramMessage;
                  const baleAlertMsg = `🔔 **[شکارچی خودکار - ستاپ A+ شکار شد]**\n\n` + setup.baleMessage;
                  
                  if (tgToken) {
                    await sendTelegramMessage(tgToken, chatId, alertMsg, {
                      inlineKeyboard: [
                        [{ text: `📊 دریافت چارت ${symbol}`, callback_data: `/analyze ${symbol} ${settings.timeframe}` }],
                        [{ text: "🧮 محاسبه حجم ورود", callback_data: `/calc_setup ${symbol} ${setup.optimalEntry} ${setup.stopLoss.price}` }],
                      ]
                    });
                  }
                  
                  if (baleToken) {
                    await sendBaleMessage(baleToken, chatId, baleAlertMsg, {
                      inlineKeyboard: [
                        [{ text: `📊 تحلیل کامل ${symbol}`, callback_data: `/analyze ${symbol} ${settings.timeframe}` }],
                      ]
                    });
                  }
                }
              }
            } catch (err) {
              console.error(`Hunter scan error for ${symbol} on chat ${chatId}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Hunter master loop error:", err);
    }
  }, 3 * 60 * 1000); // Check every 3 minutes
}
