import fetch from "node-fetch";
import { getGlobalConfig, settingsStore } from "./botSettingsStore.js";
import { sendTelegramMessage, sendBaleMessage } from "./bots.js";
import { fetchLiveMarketData } from "./market.js";
import { generateAITradingAnalysis } from "./gemini.js";
import { handleBotUpdate, performPositionCalculation, saveToHistory } from "./unifiedBotEngine.js";

export { performPositionCalculation, saveToHistory };

// De-duplication cache for hunter alerts
const hunterAlertCache = new Map<string, number>();

export async function setBotCommands(token: string) {
  try {
    const commands = [
      { command: "start", description: "شروع ربات و دریافت منوی اصلی" },
      { command: "analyze", description: "تحلیل هوشمند یک نماد (مثال: /analyze BTC)" },
      { command: "scanner", description: "اسکنر لحظه‌ای بازار و شناسایی فرصت‌های سودآور" },
      { command: "settings", description: "تنظیمات پیشرفته (ریسک، سود، اهرم، استراتژی)" },
      { command: "calc", description: "ماشین حساب مدیریت ریسک و محاسبه حجم ورود" },
      { command: "watchlist", description: "نمایش و مدیریت واچ‌لیست دیده‌بان شکارچی خودکار" },
      { command: "journal", description: "ژورنال و تاریخچه ۵ تحلیل اخیر این چت" },
      { command: "rules", description: "قوانین الزامی و سلب مسئولیت حقوقی" }
    ];
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands })
    });
  } catch (err) {
    console.error("Failed to set Telegram commands:", err);
  }
}

export async function handleTelegramUpdate(token: string, update: any) {
  return handleBotUpdate("telegram", token, update);
}

export async function handleBaleUpdate(token: string, update: any) {
  return handleBotUpdate("bale", token, update);
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
