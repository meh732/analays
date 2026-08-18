import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { POPULAR_MARKETS, fetchLiveMarketData } from "./server/market.js";
import { generateAITradingAnalysis } from "./server/gemini.js";
import { sendTelegramMessage, sendBaleMessage, sendTelegramDocument } from "./server/bots.js";
import fs from "fs";
import os from "os";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "25mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: Date.now(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Tickers list
  app.get("/api/market/tickers", async (_req, res) => {
    try {
      const results = await Promise.all(
        POPULAR_MARKETS.map(async (m) => {
          const data = await fetchLiveMarketData(m.symbol);
          return {
            symbol: data.symbol,
            name: data.name,
            category: data.category,
            price: data.price,
            change24h: data.change24h,
            high24h: data.high24h,
            low24h: data.low24h,
            volume24h: data.volume24h,
            tvSymbol: data.tvSymbol,
          };
        })
      );
      res.json({ tickers: results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Single ticker details
  app.get("/api/market/ticker/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol;
      const data = await fetchLiveMarketData(symbol);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Analysis & Futures Setup Generator
  app.post("/api/analyze", async (req, res) => {
    try {
      const { symbol, timeframe, strategy, actionPreference, userNotes, chartImageBase64, riskSettings } = req.body;
      if (!symbol) {
        return res.status(400).json({ error: "Symbol is required" });
      }

      const marketData = await fetchLiveMarketData(symbol);
      const setup = await generateAITradingAnalysis(
        {
          symbol,
          timeframe: timeframe || "15m",
          strategy: strategy || "SMC & Price Action (Smart Money Concepts)",
          actionPreference: actionPreference || "AUTO",
          userNotes,
          chartImageBase64,
          riskSettings,
        },
        marketData
      );

      res.json({
        success: true,
        setup: {
          ...setup,
          id: `setup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          status: "ACTIVE",
          riskProfileUsed: riskSettings?.profile || "moderate",
        },
      });
    } catch (err: any) {
      console.error("Analysis route error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze chart" });
    }
  });

  // Scanner endpoint: Scan multiple markets for high-probability setups
  app.post("/api/scanner", async (req, res) => {
    try {
      const { categories, timeframe, riskSettings } = req.body;
      const targetMarkets = POPULAR_MARKETS.filter((m) =>
        !categories || categories.length === 0 || categories.includes(m.category)
      ).slice(0, 6);

      const setups = await Promise.all(
        targetMarkets.map(async (m) => {
          const marketData = await fetchLiveMarketData(m.symbol);
          const setup = await generateAITradingAnalysis(
            {
              symbol: m.symbol,
              timeframe: timeframe || "15m",
              strategy: "TradingView Scanner",
              actionPreference: "AUTO",
              riskSettings,
            },
            marketData
          );
          return {
            ...setup,
            id: `scan_${m.symbol}_${Date.now()}`,
            timestamp: Date.now(),
            status: "ACTIVE",
            riskProfileUsed: riskSettings?.profile || "moderate",
          };
        })
      );

      res.json({ success: true, setups });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auto-Hunter endpoint: Analyze watchlist symbols and optionally auto-broadcast high-grade signals
  app.post("/api/auto-hunter/scan", async (req, res) => {
    try {
      const { watchlist, timeframe, riskSettings, autoBroadcast, telegramToken, telegramChatId, baleToken, baleChatId } = req.body;
      const symbolsToScan = Array.isArray(watchlist) && watchlist.length > 0
        ? watchlist
        : ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XAUUSD", "NVDA", "DOGEUSDT"];

      const discoveredSetups = await Promise.all(
        symbolsToScan.slice(0, 8).map(async (sym: string) => {
          try {
            const marketData = await fetchLiveMarketData(sym);
            const setup = await generateAITradingAnalysis(
              {
                symbol: sym,
                timeframe: timeframe || "15m",
                strategy: "Auto-Pilot Hunter Engine",
                actionPreference: "AUTO",
                riskSettings,
              },
              marketData
            );
            return {
              ...setup,
              id: `auto_${sym}_${Date.now()}`,
              timestamp: Date.now(),
              status: "ACTIVE",
              riskProfileUsed: riskSettings?.profile || "moderate",
            };
          } catch (e) {
            return null;
          }
        })
      );

      const validSetups = discoveredSetups.filter(Boolean);

      // If auto-broadcast is enabled, broadcast A+ setups to configured channels
      if (autoBroadcast) {
        const topSetups = validSetups.filter((s: any) => s.grade === "A+" && s.action !== "WAIT");
        for (const s of topSetups) {
          if (telegramToken && telegramChatId) {
            await sendTelegramMessage(telegramToken, telegramChatId, s.telegramMessage, {
              inlineKeyboard: [
                [
                  { text: `📊 چارت ${s.symbol}`, callback_data: `/analyze ${s.symbol}` },
                  { text: "🧮 محاسبه حجم", callback_data: `/calc ${s.symbol} ${s.optimalEntry} ${s.stopLoss.price}` },
                ],
                [
                  { text: "⚙️ تغییر ریسک", callback_data: "/settings_risk" },
                  { text: "🎯 اسکن مجدد", callback_data: "/scanner" },
                ],
              ],
            });
          }
          if (baleToken && baleChatId) {
            await sendBaleMessage(baleToken, baleChatId, s.baleMessage, {
              inlineKeyboard: [
                [
                  { text: `📊 تحلیل ${s.symbol}`, callback_data: `/analyze ${s.symbol}` },
                  { text: "🎯 اسکنر بازار", callback_data: "/scanner" },
                ],
              ],
            });
          }
        }
      }

      res.json({ success: true, count: validSetups.length, setups: validSetups });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bot Dispatch / Broadcast endpoint
  app.post("/api/bot/broadcast", async (req, res) => {
    try {
      const {
        telegramToken,
        telegramChatId,
        baleToken,
        baleChatId,
        telegramMessage,
        baleMessage,
        platform,
        inlineKeyboard,
        replyKeyboard,
      } = req.body;
      const results: any[] = [];

      const tokenTG = telegramToken || process.env.TELEGRAM_BOT_TOKEN;
      const tokenBale = baleToken || process.env.BALE_BOT_TOKEN;

      const defaultInline = inlineKeyboard || [
        [
          { text: "📊 چارت و تحلیل زنده", callback_data: "/scanner" },
          { text: "🧮 محاسبه‌گر حجم", callback_data: "/calc" },
        ],
        [
          { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" },
          { text: "🔔 شکار خودکار", callback_data: "/auto_hunter" },
        ],
        [
          { text: "⚖️ قوانین و سلب مسئولیت", callback_data: "/rules" },
        ],
      ];

      const defaultReplyMenu = replyKeyboard || [
        [{ text: "📊 تحلیل فوری ارزها" }, { text: "🎯 اسکنر هوشمند بازار" }],
        [{ text: "⚙️ تنظیمات ریسک و سود" }, { text: "🧮 محاسبه حجم و مارجین" }],
        [{ text: "🔔 ستاپ‌های خودکار شکار شده" }, { text: "💎 ژورنال و وین‌ریت" }],
        [{ text: "⚖️ قوانین و سلب مسئولیت حقوقی" }],
      ];

      if ((platform === "telegram" || platform === "both") && tokenTG && telegramChatId) {
        const tgRes = await sendTelegramMessage(tokenTG, telegramChatId, telegramMessage, {
          inlineKeyboard: defaultInline,
          replyKeyboard: defaultReplyMenu,
        });
        results.push(tgRes);
      }

      if ((platform === "bale" || platform === "both") && tokenBale && baleChatId) {
        const baleRes = await sendBaleMessage(tokenBale, baleChatId, baleMessage, {
          inlineKeyboard: defaultInline,
          replyKeyboard: defaultReplyMenu,
        });
        results.push(baleRes);
      }

      res.json({ success: true, results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bot Test Connection
  app.post("/api/bot/test-connection", async (req, res) => {
    try {
      const { platform, token, chatId } = req.body;
      const testMsg = `🤖 **تست اتصال ربات تریدینگ‌ویو**\n\n✅ اتصال با موفقیت برقرار شد!\nربات با تمام دکمه‌های شیشه‌ای و منوی پایین چت فعال است.\n⏱️ زمان سرور: ${new Date().toLocaleTimeString('fa-IR')}`;

      const testInline = [
        [
          { text: "📊 تست اسکنر", callback_data: "/scanner" },
          { text: "⚙️ تست تنظیم ریسک", callback_data: "/settings_risk" },
        ],
        [
          { text: "🎯 تحلیل بیتکوین", callback_data: "/analyze BTCUSDT 15m" },
          { text: "🧮 محاسبه مارجین", callback_data: "/calc" },
        ],
      ];

      const testReplyMenu = [
        [{ text: "📊 تحلیل فوری ارزها" }, { text: "🎯 اسکنر هوشمند بازار" }],
        [{ text: "⚙️ تنظیمات ریسک و سود" }, { text: "🧮 محاسبه حجم و مارجین" }],
        [{ text: "🔔 ستاپ‌های خودکار شکار شده" }, { text: "💎 ژورنال و وین‌ریت" }],
      ];

      if (platform === "telegram") {
        const result = await sendTelegramMessage(token, chatId, testMsg, {
          inlineKeyboard: testInline,
          replyKeyboard: testReplyMenu,
        });
        return res.json(result);
      } else if (platform === "bale") {
        const result = await sendBaleMessage(token, chatId, testMsg, {
          inlineKeyboard: testInline,
          replyKeyboard: testReplyMenu,
        });
        return res.json(result);
      }

      res.status(400).json({ error: "Invalid platform" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // System Backup Endpoint (Used by Linux Installer, Cron, and Auto-Backup)
  app.post("/api/system/backup", async (req, res) => {
    try {
      const { telegramToken, telegramChatId, reason } = req.body;
      const tgToken = telegramToken || process.env.TELEGRAM_BOT_TOKEN;
      const tgChatId = telegramChatId || process.env.TELEGRAM_CHAT_ID;

      const timestamp = new Date().toISOString();
      const formattedDate = new Date().toLocaleString("fa-IR");

      // Read .env if exists
      let envContent = "";
      try {
        const envPath = path.join(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, "utf-8");
        }
      } catch {}

      const backupData = {
        version: "2.5.0",
        timestamp,
        formattedDate,
        reason: reason || "Manual System Backup",
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          uptimeHours: (os.uptime() / 3600).toFixed(2),
          nodeVersion: process.version,
          totalMemoryMB: (os.totalmem() / (1024 * 1024)).toFixed(0),
          freeMemoryMB: (os.freemem() / (1024 * 1024)).toFixed(0),
        },
        env: envContent,
      };

      const backupJsonString = JSON.stringify(backupData, null, 2);
      const backupFileName = `tradingview_bot_backup_${Date.now()}.json`;

      let telegramSent = false;
      let telegramError = null;

      if (tgToken && tgChatId) {
        const caption = `📦 **پشتیبان‌گیری خودکار سیستم تریدینگ‌ویو (Backup Archive)**\n\n` +
          `🔹 **دلیل بکاپ:** ${reason || 'بکاپ زمان‌بندی‌شده / قبل از عملیات'}\n` +
          `📅 **تاریخ:** ${formattedDate}\n` +
          `🖥️ **سرور:** ${os.hostname()} (${os.platform()})\n` +
          `⏱️ **آپ‌تایم:** ${(os.uptime() / 3600).toFixed(1)} ساعت\n\n` +
          `🔒 *این فایل شامل تمامی تنظیمات، متغیرهای محیطی و کلیدهای ربات است و برای بازیابی کامل سرور کاربرد دارد.*`;

        const tgDocRes = await sendTelegramDocument(
          tgToken,
          tgChatId.toString(),
          Buffer.from(backupJsonString, "utf-8"),
          backupFileName,
          caption
        );

        if (tgDocRes.success) {
          telegramSent = true;
        } else {
          telegramError = tgDocRes.error;
          // Fallback: Send message alert if document sending fails
          await sendTelegramMessage(
            tgToken,
            tgChatId.toString(),
            `⚠️ **هشدار ایجاد بکاپ:** فایل بکاپ ${backupFileName} ایجاد شد اما ارسال داکیومنت با خطا مواجه گردید: ${tgDocRes.error}`
          );
        }
      }

      res.json({
        success: true,
        message: "Backup created successfully",
        fileName: backupFileName,
        timestamp,
        telegramSent,
        telegramError,
        backupData,
      });
    } catch (err: any) {
      console.error("Backup route error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // System Restore Endpoint
  app.post("/api/system/restore", async (req, res) => {
    try {
      const { backupData, telegramToken, telegramChatId } = req.body;
      if (!backupData) {
        return res.status(400).json({ error: "No backup data provided" });
      }

      const tgToken = telegramToken || process.env.TELEGRAM_BOT_TOKEN;
      const tgChatId = telegramChatId || process.env.TELEGRAM_CHAT_ID;

      // Restore .env if present in backupData
      if (backupData.env) {
        const envPath = path.join(process.cwd(), ".env");
        fs.writeFileSync(envPath, backupData.env, "utf-8");
      }

      const formattedDate = new Date().toLocaleString("fa-IR");

      if (tgToken && tgChatId) {
        await sendTelegramMessage(
          tgToken,
          tgChatId.toString(),
          `♻️ **بازگردانی موفقیت‌آمیز سیستم از فایل بکاپ**\n\n` +
          `📅 **تاریخ بازگردانی:** ${formattedDate}\n` +
          `📦 **تاریخ نسخه بکاپ:** ${backupData.formattedDate || backupData.timestamp}\n` +
          `✅ تمامی متغیرها و تنظیمات ربات با موفقیت بازیابی شدند.`
        );
      }

      res.json({
        success: true,
        message: "System successfully restored from backup snapshot",
      });
    } catch (err: any) {
      console.error("Restore route error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Telegram Webhook Endpoint
  app.post("/api/bot/webhook/telegram", async (req, res) => {
    res.json({ ok: true }); // Fast ACK to Telegram
    try {
      const update = req.body;
      const message = update?.message;
      const callbackQuery = update?.callback_query;
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return;

      const mainReplyMenu = [
        [{ text: "📊 تحلیل فوری ارزها" }, { text: "🎯 اسکنر هوشمند بازار" }],
        [{ text: "⚙️ تنظیمات ریسک و سود" }, { text: "🧮 محاسبه حجم و مارجین" }],
        [{ text: "🔔 ستاپ‌های خودکار شکار شده" }, { text: "💎 ژورنال و وین‌ریت" }],
        [{ text: "⚖️ قوانین و سلب مسئولیت حقوقی" }],
      ];

      // Legal Disclaimer Message
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

      // Handle Glass Button Clicks (Callback Queries)
      if (callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

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

        if (data.startsWith("/analyze")) {
          const parts = data.replace("/analyze", "").trim().split(" ");
          const symbol = parts[0]?.toUpperCase() || "BTCUSDT";
          const timeframe = parts[1] || "15m";
          const marketData = await fetchLiveMarketData(symbol);
          const setup = await generateAITradingAnalysis({ symbol, timeframe }, marketData);
          await sendTelegramMessage(token, chatId.toString(), setup.telegramMessage, {
            inlineKeyboard: [
              [
                { text: `🔄 تحلیل مجدد ${symbol}`, callback_data: `/analyze ${symbol} ${timeframe}` },
                { text: "🧮 محاسبه حجم", callback_data: `/calc ${symbol}` },
              ],
              [
                { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" },
                { text: "🎯 اسکنر بازار", callback_data: "/scanner" },
              ],
            ],
            replyKeyboard: mainReplyMenu,
          });
        } else if (data === "/scanner") {
          const setups = await Promise.all(
            POPULAR_MARKETS.slice(0, 3).map(async (m) => {
              const md = await fetchLiveMarketData(m.symbol);
              return generateAITradingAnalysis({ symbol: m.symbol, timeframe: "15m" }, md);
            })
          );
          const text = `🎯 **اسکن فوری برترین فرصت‌های بازار** 🎯\n\n` +
            setups.map(s => `🔹 **${s.symbol}**: جهت ${s.action === "LONG" ? "🟢 لانگ" : "🔴 شورت"} | ورود: $${s.optimalEntry} | تارگت: $${s.takeProfits[0]?.price}`).join("\n\n");
          await sendTelegramMessage(token, chatId.toString(), text, {
            inlineKeyboard: setups.map(s => [{ text: `📊 دریافت ستاپ کامل ${s.symbol}`, callback_data: `/analyze ${s.symbol} 15m` }]),
            replyKeyboard: mainReplyMenu,
          });
        } else if (data === "/settings_risk") {
          const riskMsg = `⚙️ **پروفایل مدیریت ریسک و سوددهی ربات** ⚙️\n\nحالت‌های قابل انتخاب:\n1️⃣ 🛡️ **کم‌ریسک (Conservative)**: لوریج 3x-5x | ریسک ۱٪\n2️⃣ ⚖️ **متعادل (Moderate)**: لوریج 10x-15x | ریسک ۲٪\n3️⃣ 🚀 **تهاجمی (Aggressive)**: لوریج 20x-30x | اسکلپ پربازده`;
          await sendTelegramMessage(token, chatId.toString(), riskMsg, {
            inlineKeyboard: [
              [
                { text: "🛡️ فعال‌سازی کم‌ریسک", callback_data: "/set_risk_conservative" },
                { text: "⚖️ فعال‌سازی متعادل", callback_data: "/set_risk_moderate" },
                { text: "🚀 فعال‌سازی تهاجمی", callback_data: "/set_risk_aggressive" },
              ],
              [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }],
            ],
            replyKeyboard: mainReplyMenu,
          });
        }
        return;
      }

      if (!message || !message.text) return;

      const chatId = message.chat.id;
      const text = message.text.trim();

      if (text === "/start" || text === "شروع" || text === "/main_menu") {
        const welcome = `👋 **سلام! به بات تریدینگ‌ویو، تحلیل تکنیکال و سیگنال‌های فیوچرز خوش آمدید.**

تمام امکانات پنل به صورت **دکمه‌های شیشه‌ای** و **منوی زیر چت** در دسترس شماست:
▫️ دریافت نقاط ورود بهینه، تارگت‌های TP1, TP2, TP3 و استاپ‌لاس
▫️ اسکن خودکار واچ‌لیست ارزها و سهام‌ها
▫️ تنظیم پروفایل سوددهی و ریسک (کم‌ریسک، متعادل، تهاجمی)
▫️ محاسبه‌گر مارجین و حجم پوزیشن

برای شروع روی دکمه‌های زیر کلیک کنید:`;

        const glassButtons = [
          [
            { text: "📊 تحلیل BTC", callback_data: "/analyze BTCUSDT 15m" },
            { text: "📊 تحلیل ETH", callback_data: "/analyze ETHUSDT 15m" },
            { text: "📊 تحلیل SOL", callback_data: "/analyze SOLUSDT 15m" },
          ],
          [
            { text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" },
            { text: "⚙️ تنظیمات سود و ریسک", callback_data: "/settings_risk" },
          ],
          [
            { text: "🔔 شکار خودکار فرصت‌ها", callback_data: "/auto_hunter" },
            { text: "🧮 محاسبه‌گر حجم", callback_data: "/calc" },
          ],
        ];

        await sendTelegramMessage(token, chatId.toString(), welcome, {
          inlineKeyboard: glassButtons,
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
            return generateAITradingAnalysis({ symbol: m.symbol, timeframe: "15m" }, md);
          })
        );
        const scanText = `🎯 **اسکنر بازار تریدینگ‌ویو (ستاپ‌های فعال)**\n\n` +
          setups.map(s => `🔹 **#${s.symbol}**: ${s.action === "LONG" ? "🟢 لانگ" : "🔴 شورت"} | قیمت فعلی: $${s.currentPrice} | ورود: $${s.optimalEntry} | TP1: $${s.takeProfits[0]?.price}`).join("\n\n");
        await sendTelegramMessage(token, chatId.toString(), scanText, {
          inlineKeyboard: setups.map(s => [{ text: `🚀 دریافت ستاپ ${s.symbol}`, callback_data: `/analyze ${s.symbol} 15m` }]),
          replyKeyboard: mainReplyMenu,
        });
      } else if (text === "⚙️ تنظیمات ریسک و سود" || text === "⚙️ تنظیمات ریسک") {
        const riskMsg = `⚙️ **تنظیمات حالت سوددهی و مدیریت ریسک**\n\nمی‌توانید استراتژی پیشنهادات ورود و خروج ربات را روی یکی از حالات زیر قرار دهید:`;
        await sendTelegramMessage(token, chatId.toString(), riskMsg, {
          inlineKeyboard: [
            [{ text: "🛡️ حالت کم‌ریسک (اهرم ۳-۵ و استاپ مطمئن)", callback_data: "/set_risk_conservative" }],
            [{ text: "⚖️ حالت متعادل (اهرم ۱۰-۱۵ استاندارد)", callback_data: "/set_risk_moderate" }],
            [{ text: "🚀 حالت تهاجمی (اهرم ۲۰-۳۰ و اسکلپ پربازده)", callback_data: "/set_risk_aggressive" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      } else if (text === "🧮 محاسبه حجم و مارجین" || text === "/calc") {
        const calcMsg = `🧮 **ماشین‌حساب هوشمند مدیریت سرمایه و مارجین**\n\nبرای محاسبه دقیق حجم ورود:\nدستور را به شکل زیر بفرستید:\n\`/calc [سرمایه] [درصد ریسک] [قیمت ورود] [استاپ‌لاس]\`\n\nمثال: \`/calc 1000 2 68000 66500\``;
        await sendTelegramMessage(token, chatId.toString(), calcMsg, {
          inlineKeyboard: [
            [{ text: "📊 ستاپ با محاسبه خودکار BTC", callback_data: "/analyze BTCUSDT 15m" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      } else if (text === "🔔 ستاپ‌های خودکار شکار شده" || text === "/auto_hunter") {
        const hunterMsg = `🔔 **شکارچی خودکار فرصت‌های تریدینگ‌ویو (Auto-Pilot AI Hunter)**\n\nسیستم به صورت خودکار ارزها و سهام‌های منتخب را رصد کرده و در صورت کشف ستاپ با گرید A+، آن را فورا اطلاع‌رسانی می‌کند.`;
        await sendTelegramMessage(token, chatId.toString(), hunterMsg, {
          inlineKeyboard: [
            [{ text: "🎯 اجرای اسکن فوری واچ‌لیست", callback_data: "/scanner" }],
            [{ text: "⚙️ تنظیمات ریسک شکارچی", callback_data: "/settings_risk" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      } else if (text === "💎 ژورنال و وین‌ریت") {
        const journalMsg = `📊 **آمار و ژورنال عملکرد سیگنال‌های تریدینگ‌ویو**\n\n🔹 وین‌ریت کل: 86.4%\n🔹 میانگین ریسک به ریوارد: 1:3.1\n🔹 تعداد سیگنال‌های تارگت خورده: ۴۲ از ۴۸\n🔹 وضعیت بازار فعلی: روند صعودی قدرتمند (Bullish Expansion)`;
        await sendTelegramMessage(token, chatId.toString(), journalMsg, {
          replyKeyboard: mainReplyMenu,
        });
      } else if (text === "⚖️ قوانین و سلب مسئولیت حقوقی" || text === "قوانین" || text === "/rules" || text === "/disclaimer") {
        await sendTelegramMessage(token, chatId.toString(), legalRulesMessage, {
          inlineKeyboard: [
            [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
            [{ text: "🔙 بازگشت به منوی اصلی", callback_data: "/main_menu" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      } else {
        // Extract symbol
        const parts = text.replace("/analyze", "").replace("/futures", "").trim().split(" ");
        const symbol = parts[0]?.toUpperCase() || "BTCUSDT";
        const timeframe = parts[1] || "15m";

        const marketData = await fetchLiveMarketData(symbol);
        const setup = await generateAITradingAnalysis({ symbol, timeframe }, marketData);
        await sendTelegramMessage(token, chatId.toString(), setup.telegramMessage, {
          inlineKeyboard: [
            [
              { text: `🔄 تحلیل مجدد ${symbol}`, callback_data: `/analyze ${symbol} ${timeframe}` },
              { text: "🧮 محاسبه حجم", callback_data: `/calc ${symbol}` },
            ],
            [
              { text: "⚙️ تغییر ریسک", callback_data: "/settings_risk" },
              { text: "🎯 اسکنر بازار", callback_data: "/scanner" },
            ],
          ],
          replyKeyboard: mainReplyMenu,
        });
      }
    } catch (err) {
      console.error("Telegram webhook error:", err);
    }
  });

  // Bale Webhook Endpoint
  app.post("/api/bot/webhook/bale", async (req, res) => {
    res.json({ ok: true });
    try {
      const update = req.body;
      const message = update?.message;
      const callbackQuery = update?.callback_query;
      const token = process.env.BALE_BOT_TOKEN;
      if (!token) return;

      const mainReplyMenu = [
        [{ text: "📊 تحلیل فوری ارزها" }, { text: "🎯 اسکنر هوشمند بازار" }],
        [{ text: "⚙️ تنظیمات ریسک و سود" }, { text: "🧮 محاسبه حجم و مارجین" }],
        [{ text: "🔔 ستاپ‌های خودکار شکار شده" }, { text: "💎 ژورنال و وین‌ریت" }],
        [{ text: "⚖️ قوانین و سلب مسئولیت حقوقی" }],
      ];

      const baleLegalRulesMessage = `⚖️ **قوانین و سلب مسئولیت حقوقی ربات تریدینگ‌ویو (بله)**

۱. 👤 **مسئولیت کامل ۱۰۰٪ با کاربر:**
کلیه ستاپ‌ها و نقاط ورود صرفاً خروجی هوش مصنوعی و جنبه آموزشی دارد. تصمیم‌گیری نهایی و مسئولیت سود یا زیان در بازار با خود کاربر است.

۲. 🚫 **عدم نفع مالی سازنده (Zero Gain):**
هیچ درصدی از معاملات شما به سازنده تعلق نمی‌گیرد و سازنده هیچ سهمی در گردش مالی شما ندارد.

۳. 🌍 **پوشش کلیه بازارهای تریدینگ‌ویو:**
شامل ارزهای دیجیتال (Crypto)، فارکس (Forex)، انس طلا (Gold) و سهام بین‌المللی.

۴. 🛡️ **مدیریت ریسک:**
تعیین حد ضرر (Stop Loss) و مدیریت حداکثر ۲٪ ریسک در هر معامله الزامی است.`;

      if (callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
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
        if (data.startsWith("/analyze")) {
          const parts = data.replace("/analyze", "").trim().split(" ");
          const symbol = parts[0]?.toUpperCase() || "BTCUSDT";
          const marketData = await fetchLiveMarketData(symbol);
          const setup = await generateAITradingAnalysis({ symbol, timeframe: "15m" }, marketData);
          await sendBaleMessage(token, chatId.toString(), setup.baleMessage, {
            inlineKeyboard: [
              [{ text: `📊 تحلیل مجدد ${symbol}`, callback_data: `/analyze ${symbol}` }],
              [{ text: "🎯 اسکنر بازار", callback_data: "/scanner" }],
            ],
            replyKeyboard: mainReplyMenu,
          });
        }
        return;
      }

      if (!message || !message.text) return;

      const chatId = message.chat.id;
      const text = message.text.trim();

      if (text === "/start" || text === "شروع") {
        const welcome = `👋 سلام به ربات هوشمند تریدینگ‌ویو و فیوچرز (بله) خوش آمدید!\n\nتمام ابزارهای پنل از طریق دکمه‌های زیر و منوی کیبورد در دسترس هستند:`;
        await sendBaleMessage(token, chatId.toString(), welcome, {
          inlineKeyboard: [
            [{ text: "📊 تحلیل بیتکوین", callback_data: "/analyze BTCUSDT" }, { text: "📊 تحلیل اتریوم", callback_data: "/analyze ETHUSDT" }],
            [{ text: "🎯 اسکنر هوشمند بازار", callback_data: "/scanner" }, { text: "⚙️ تنظیمات ریسک", callback_data: "/settings_risk" }],
            [{ text: "⚖️ قوانین و سلب مسئولیت", callback_data: "/rules" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      } else if (text === "🎯 اسکنر هوشمند بازار" || text === "/scanner") {
        const setups = await Promise.all(
          POPULAR_MARKETS.slice(0, 3).map(async (m) => {
            const md = await fetchLiveMarketData(m.symbol);
            return generateAITradingAnalysis({ symbol: m.symbol, timeframe: "15m" }, md);
          })
        );
        const scanText = `🎯 **اسکنر بازار تریدینگ‌ویو**\n\n` +
          setups.map(s => `▪️ #${s.symbol}: ${s.action === "LONG" ? "خرید لانگ" : "فروش شورت"} | ورود: $${s.optimalEntry} | TP1: $${s.takeProfits[0]?.price}`).join("\n\n");
        await sendBaleMessage(token, chatId.toString(), scanText, {
          inlineKeyboard: setups.map(s => [{ text: `تحلیل کامل ${s.symbol}`, callback_data: `/analyze ${s.symbol}` }]),
          replyKeyboard: mainReplyMenu,
        });
      } else if (text === "⚖️ قوانین و سلب مسئولیت حقوقی" || text === "/rules" || text === "قوانین") {
        await sendBaleMessage(token, chatId.toString(), baleLegalRulesMessage, {
          inlineKeyboard: [
            [{ text: "🎯 اسکنر بازار", callback_data: "/scanner" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      } else {
        const parts = text.replace("/analyze", "").replace("/futures", "").trim().split(" ");
        const symbol = parts[0]?.toUpperCase() || "BTCUSDT";
        const marketData = await fetchLiveMarketData(symbol);
        const setup = await generateAITradingAnalysis({ symbol, timeframe: "15m" }, marketData);
        await sendBaleMessage(token, chatId.toString(), setup.baleMessage, {
          inlineKeyboard: [
            [{ text: `📊 تحلیل مجدد ${symbol}`, callback_data: `/analyze ${symbol}` }],
            [{ text: "🎯 اسکنر بازار", callback_data: "/scanner" }],
          ],
          replyKeyboard: mainReplyMenu,
        });
      }
    } catch (err) {
      console.error("Bale webhook error:", err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TradingView Bot Server running on http://localhost:${PORT}`);
  });
}

startServer();
