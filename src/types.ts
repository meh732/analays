export type MarketCategory = 'crypto' | 'forex' | 'stocks' | 'commodities';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export type TradeAction = 'LONG' | 'SHORT' | 'WAIT';

export type SetupGrade = 'A+' | 'A' | 'B';

export type BotPlatform = 'telegram' | 'bale' | 'both';

export type RiskProfileMode = 'conservative' | 'moderate' | 'aggressive';

export type SignalEngineMode = 'OFFLINE_RULES' | 'ONLINE_AI';

export type TradeTimeHorizon = 'scalp_minutes' | 'intraday_hours' | 'swing_days' | 'position_weeks';

export interface TradeTimingDetails {
  horizon: TradeTimeHorizon;
  horizonLabelFa: string; // e.g. "اسکلپ سریع (۵ تا ۳۰ دقیقه)"
  horizonLabelEn: string; // e.g. "Fast Scalp (5 to 30 mins)"
  entryValidityWindowFa: string; // e.g. "معتبر برای ورود تا ۳۰ دقیقه آینده"
  estimatedHoldingTimeFa: string; // e.g. "۱۵ الی ۴۵ دقیقه"
  estimatedHoldingTimeEn: string;
  tp1EstimatedTimeFa: string; // e.g. "۱۰ الی ۲۰ دقیقه"
  tp2EstimatedTimeFa: string; // e.g. "۲۵ الی ۴۵ دقیقه"
  tp3EstimatedTimeFa: string; // e.g. "۴۵ الی ۹۰ دقیقه"
  invalidationTimeoutFa: string; // e.g. "در صورت عدم لمس نقطه ورود تا ۱ ساعت آینده، ستاپ منقضی است"
}

export interface RiskSettings {
  profile: RiskProfileMode; // کم‌ریسک، متعادل، تهاجمی
  maxRiskPercent: number; // مثلا ۱٪ تا ۵٪
  maxLeverage: number; // مثلا 5x, 10x, 20x, 50x
  minRRRatio: number; // مثلا 1:2.5
  tpStyle: 'tight_safe' | 'balanced' | 'extended_runner';
}

export interface AutoHunterConfig {
  enabled: boolean;
  intervalMinutes: number; // بازه زمانی اسکن خودکار (مثلا ۱، ۳، ۵، ۱۵ دقیقه)
  watchlist: string[]; // نمادهای تحت نظر
  minGrade: SetupGrade;
  autoBroadcastToTelegram: boolean;
  autoBroadcastToBale: boolean;
}

export interface TakeProfitTarget {
  target: number;
  price: number;
  pnlPercent: number;
  sizePercent: number;
  descriptionFa: string;
  descriptionEn: string;
  estimatedTimeFa?: string;
}

export interface StopLossConfig {
  price: number;
  lossPercent: number;
  invalidationReasonFa: string;
  invalidationReasonEn: string;
  maxHoldingTimeFa?: string;
}

export interface TradeSetup {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  marketCategory: MarketCategory;
  timeframe: Timeframe;
  timeHorizon?: TradeTimeHorizon;
  timing?: TradeTimingDetails;
  action: TradeAction;
  grade: SetupGrade;
  confidence: number;
  currentPrice: number;
  entryZone: [number, number];
  optimalEntry: number;
  takeProfits: TakeProfitTarget[];
  stopLoss: StopLossConfig;
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
  engineMode?: SignalEngineMode;
  knowledgeBaseRulesApplied?: string[];
  educationalNotesFa?: string;
  riskProfileUsed?: RiskProfileMode;
  timestamp: number;
  telegramMessage: string;
  baleMessage: string;
  status: 'PENDING' | 'ACTIVE' | 'HIT_TP1' | 'HIT_TP2' | 'HIT_TP3' | 'HIT_SL' | 'CLOSED';
}

export interface InlineButton {
  text: string;
  callback_data: string;
  url?: string;
  iconType?: 'chart' | 'calc' | 'risk' | 'scan' | 'bot' | 'refresh';
}

export interface BotMessage {
  id: string;
  platform: 'telegram' | 'bale';
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  setup?: TradeSetup;
  buttons?: InlineButton[][];
}

export interface MarketTicker {
  symbol: string;
  name: string;
  category: MarketCategory;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  tvSymbol: string;
}

export interface BotConfig {
  telegramToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  baleToken: string;
  baleChatId: string;
  baleEnabled: boolean;
  autoBroadcast: boolean;
  defaultEngineMode: SignalEngineMode;
  defaultTimeframe: Timeframe;
  defaultRiskPercent: number;
  riskSettings: RiskSettings;
  autoHunter: AutoHunterConfig;
}

