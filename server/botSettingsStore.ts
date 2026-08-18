import fs from "fs";
import path from "path";

export interface ChatSettings {
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
  engineMode: 'ONLINE_AI' | 'OFFLINE_RULES';
  strategy: string;
  riskPercent: number;
  balance: number;
  watchlist: string[];
  autoHunterEnabled: boolean;
  directionPreference: 'AUTO' | 'LONG' | 'SHORT';
  timeHorizon: 'scalp_minutes' | 'intraday_hours' | 'swing_days';
  leverage: number;
  tpStyle: 'tight_safe' | 'balanced' | 'extended_runner';
  minRRRatio: number;
  termsAccepted?: boolean;
  termsAcceptedAt?: number;
  history?: any[];
  pendingCustomQuoteBase?: string;
  pendingAdminPasscode?: boolean;
  pendingAdminBroadcast?: boolean;
}

export interface GlobalBotConfig {
  telegramToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  baleToken: string;
  baleChatId: string;
  baleEnabled: boolean;
  autoBroadcast: boolean;
  enableAiEngine?: boolean;
  enableOfflineEngine?: boolean;
  defaultEngineMode?: 'ONLINE_AI' | 'OFFLINE_RULES';
  defaultTimeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
  defaultRiskPercent: number;
  adminPasscode: string;
  adminChatIds: string[];
  riskSettings: {
    profile: 'conservative' | 'moderate' | 'aggressive';
    maxRiskPercent: number;
    maxLeverage: number;
    minRRRatio: number;
    tpStyle: 'tight_safe' | 'balanced' | 'extended_runner';
  };
  autoHunter: {
    enabled: boolean;
    intervalMinutes: number;
    watchlist: string[];
    minGrade: 'A+' | 'A' | 'B';
    autoBroadcastToTelegram: boolean;
    autoBroadcastToBale: boolean;
  };
}

const DEFAULT_SETTINGS: ChatSettings = {
  riskProfile: 'moderate',
  timeframe: '15m',
  engineMode: 'ONLINE_AI',
  strategy: 'SMC & Price Action (Smart Money Concepts)',
  riskPercent: 2,
  balance: 1000,
  watchlist: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XAUUSD', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'EURUSD'],
  autoHunterEnabled: false,
  directionPreference: 'AUTO',
  timeHorizon: 'intraday_hours',
  leverage: 15,
  tpStyle: 'balanced',
  minRRRatio: 2.5,
  termsAccepted: false,
};

const DEFAULT_GLOBAL_CONFIG: GlobalBotConfig = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  telegramEnabled: true,
  baleToken: process.env.BALE_BOT_TOKEN || "",
  baleChatId: process.env.BALE_CHAT_ID || "",
  baleEnabled: true,
  autoBroadcast: false,
  enableAiEngine: true,
  enableOfflineEngine: true,
  defaultEngineMode: 'ONLINE_AI',
  defaultTimeframe: '15m',
  defaultRiskPercent: 2,
  adminPasscode: process.env.ADMIN_PASSCODE || "admin123",
  adminChatIds: [],
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
    watchlist: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XAUUSD', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'EURUSD'],
    minGrade: 'A',
    autoBroadcastToTelegram: false,
    autoBroadcastToBale: false,
  },
};

const storePath = path.join(process.cwd(), "server", "bot_settings.json");
let settingsStore: Record<string, any> = {};

// In-memory authenticated admin sessions per chat ID
const authenticatedAdminChats = new Set<string>();

export function isAdmin(chatId: string | number): boolean {
  const cid = String(chatId);
  const cfg = getGlobalConfig();
  if (authenticatedAdminChats.has(cid)) return true;
  if (cfg.adminChatIds && cfg.adminChatIds.includes(cid)) return true;
  if (cfg.telegramChatId && cfg.telegramChatId === cid) return true;
  if (cfg.baleChatId && cfg.baleChatId === cid) return true;
  return false;
}

export function authenticateAdmin(chatId: string | number, passcode: string): boolean {
  const cid = String(chatId);
  const cfg = getGlobalConfig();
  const validPass = cfg.adminPasscode || "admin123";
  if (passcode.trim() === validPass.trim()) {
    authenticatedAdminChats.add(cid);
    return true;
  }
  return false;
}

export function deauthenticateAdmin(chatId: string | number): void {
  const cid = String(chatId);
  authenticatedAdminChats.delete(cid);
}

export function getAllActiveChatsCount(): number {
  const keys = Object.keys(settingsStore).filter(k => !k.startsWith("__"));
  return Math.max(1, keys.length);
}

// Load settings from JSON file
export function loadAllSettings() {
  try {
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, "utf-8");
      settingsStore = JSON.parse(data);
      
      // Forcefully sanitize all existing chat watchlists on server load
      for (const cid of Object.keys(settingsStore)) {
        if (settingsStore[cid] && Array.isArray(settingsStore[cid].watchlist)) {
          settingsStore[cid].watchlist = settingsStore[cid].watchlist.filter(
            (s: string) => !['TSLA', 'NVDA', 'AAPL', 'MSFT'].includes(s.toUpperCase())
          );
        }
      }
      if (settingsStore.__global_config__?.autoHunter?.watchlist) {
        settingsStore.__global_config__.autoHunter.watchlist = settingsStore.__global_config__.autoHunter.watchlist.filter(
          (s: string) => !['TSLA', 'NVDA', 'AAPL', 'MSFT'].includes(s.toUpperCase())
        );
      }
      saveAllSettings();
    }
  } catch (err) {
    console.error("Failed to load bot settings, starting fresh:", err);
    settingsStore = {};
  }
}

// Save settings to JSON file
export function saveAllSettings() {
  try {
    const parentDir = path.dirname(storePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(storePath, JSON.stringify(settingsStore, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save bot settings:", err);
  }
}

// Get settings for a specific chat, initializing with defaults if not present
export function getChatSettings(chatId: string | number): ChatSettings {
  const cid = String(chatId);
  if (!settingsStore[cid]) {
    settingsStore[cid] = { ...DEFAULT_SETTINGS };
    saveAllSettings();
  }
  
  // Ensure all default properties exist
  settingsStore[cid] = {
    ...DEFAULT_SETTINGS,
    ...settingsStore[cid]
  };
  
  return settingsStore[cid];
}

// Update settings for a specific chat
export function updateChatSettings(chatId: string | number, updates: Partial<ChatSettings>): ChatSettings {
  const cid = String(chatId);
  const current = getChatSettings(cid);
  settingsStore[cid] = {
    ...current,
    ...updates,
  };
  saveAllSettings();
  return settingsStore[cid];
}

// Get global config
export function getGlobalConfig(): GlobalBotConfig {
  if (!settingsStore["__global_config__"]) {
    settingsStore["__global_config__"] = { ...DEFAULT_GLOBAL_CONFIG };
    saveAllSettings();
  }
  
  // Merge defaults to ensure no fields are missing
  settingsStore["__global_config__"] = {
    ...DEFAULT_GLOBAL_CONFIG,
    ...settingsStore["__global_config__"],
    riskSettings: {
      ...DEFAULT_GLOBAL_CONFIG.riskSettings,
      ...(settingsStore["__global_config__"].riskSettings || {})
    },
    autoHunter: {
      ...DEFAULT_GLOBAL_CONFIG.autoHunter,
      ...(settingsStore["__global_config__"].autoHunter || {})
    }
  };
  
  return settingsStore["__global_config__"];
}

// Update global config
export function updateGlobalConfig(updates: Partial<GlobalBotConfig>): GlobalBotConfig {
  const current = getGlobalConfig();
  settingsStore["__global_config__"] = {
    ...current,
    ...updates,
  };
  saveAllSettings();
  return settingsStore["__global_config__"];
}

// Initialize on import
loadAllSettings();
export { settingsStore };
