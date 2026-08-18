import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { POPULAR_MARKETS, fetchLiveMarketData } from "./server/market.js";
import { generateAITradingAnalysis } from "./server/gemini.js";
import { sendTelegramMessage, sendBaleMessage, sendTelegramDocument } from "./server/bots.js";
import fs from "fs";
import os from "os";
import { getChatSettings, updateChatSettings, getGlobalConfig, updateGlobalConfig, settingsStore } from "./server/botSettingsStore.js";
import { handleTelegramUpdate, handleBaleUpdate, startTelegramPollingLoop, startBalePollingLoop, startBackgroundHunter } from "./server/botHandlers.js";

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
      const { symbol, timeframe, strategy, actionPreference, userNotes, chartImageBase64, riskSettings, engineMode } = req.body;
      if (!symbol) {
        return res.status(400).json({ error: "Symbol is required" });
      }

      const marketData = await fetchLiveMarketData(symbol, timeframe || "15m");
      const setup = await generateAITradingAnalysis(
        {
          symbol,
          timeframe: timeframe || "15m",
          strategy: strategy || (engineMode === "OFFLINE_RULES" ? "SMC & Offline Knowledge Base" : "SMC & Price Action (Smart Money Concepts)"),
          actionPreference: actionPreference || "AUTO",
          userNotes,
          chartImageBase64,
          riskSettings,
          engineMode: engineMode || "ONLINE_AI",
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
      const { categories, timeframe, riskSettings, engineMode } = req.body;
      const targetMarkets = POPULAR_MARKETS.filter((m) =>
        !categories || categories.length === 0 || categories.includes(m.category)
      ).slice(0, 6);

      const setups = await Promise.all(
        targetMarkets.map(async (m) => {
          const marketData = await fetchLiveMarketData(m.symbol, timeframe || "15m");
          const setup = await generateAITradingAnalysis(
            {
              symbol: m.symbol,
              timeframe: timeframe || "15m",
              strategy: engineMode === "OFFLINE_RULES" ? "Offline Quantitative Scanner" : "TradingView Scanner",
              actionPreference: "AUTO",
              riskSettings,
              engineMode: engineMode || "ONLINE_AI",
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
      const { watchlist, timeframe, riskSettings, autoBroadcast, telegramToken, telegramChatId, baleToken, baleChatId, engineMode } = req.body;
      const symbolsToScan = Array.isArray(watchlist) && watchlist.length > 0
        ? watchlist
        : ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XAUUSD", "NVDA", "DOGEUSDT"];

      const discoveredSetups = await Promise.all(
        symbolsToScan.slice(0, 8).map(async (sym: string) => {
          try {
            const marketData = await fetchLiveMarketData(sym, timeframe || "15m");
            const setup = await generateAITradingAnalysis(
              {
                symbol: sym,
                timeframe: timeframe || "15m",
                strategy: engineMode === "OFFLINE_RULES" ? "Auto-Pilot Offline Knowledge Engine" : "Auto-Pilot Hunter Engine",
                actionPreference: "AUTO",
                riskSettings,
                engineMode: engineMode || "ONLINE_AI",
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
        fs.writeFileSync(envPath, backupData.env);
      }

      // Restore bot_settings.json if present
      if (backupData.botSettings) {
        fs.writeFileSync(
          path.join(process.cwd(), "server/bot_settings.json"),
          JSON.stringify(backupData.botSettings, null, 2)
        );
      }

      if (tgToken && tgChatId) {
        await sendTelegramMessage(
          tgToken,
          tgChatId.toString(),
          `✅ **بازیابی سیستم با موفقیت انجام شد (Restore Complete)**\n\nتنظیمات و کلیدها با موفقیت بارگذاری شدند و سیستم آماده به کار است.`
        );
      }

      res.json({
        success: true,
        message: "System restore completed successfully",
      });
    } catch (err: any) {
      console.error("Restore route error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Global Bot Config Endpoints ---
  app.get("/api/bot/config", (_req, res) => {
    try {
      res.json({ success: true, config: getGlobalConfig() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/bot/config", (req, res) => {
    try {
      const config = updateGlobalConfig(req.body);
      // Restart long-polling loops to pick up new tokens/configs
      startTelegramPollingLoop().catch(console.error);
      startBalePollingLoop().catch(console.error);
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Telegram Webhook Endpoint
  app.post("/api/bot/webhook/telegram", async (req, res) => {
    res.json({ ok: true });
    try {
      const config = getGlobalConfig();
      const token = config.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
      if (token) {
        await handleTelegramUpdate(token, req.body);
      }
    } catch (err) {
      console.error("Telegram webhook error:", err);
    }
  });

  // Bale Webhook Endpoint
  app.post("/api/bot/webhook/bale", async (req, res) => {
    res.json({ ok: true });
    try {
      const config = getGlobalConfig();
      const token = config.baleToken || process.env.BALE_BOT_TOKEN;
      if (token) {
        await handleBaleUpdate(token, req.body);
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
    
    // Start polling and master auto hunter loop
    setTimeout(() => {
      startTelegramPollingLoop().catch(console.error);
      startBalePollingLoop().catch(console.error);
      startBackgroundHunter();
    }, 1500);
  });
}

startServer();
