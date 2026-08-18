export interface LiveTickerData {
  symbol: string;
  name: string;
  category: 'crypto' | 'forex' | 'stocks' | 'commodities';
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  tvSymbol: string;
  isLiveFeed?: boolean;
  lastUpdated?: number;
  indicators: {
    rsi14: number;
    macd: { line: number; signal: number; hist: number };
    ema20: number;
    ema50: number;
    ema200: number;
    atr: number;
    support1: number;
    support2: number;
    resistance1: number;
    resistance2: number;
  };
}

export const POPULAR_MARKETS: Array<{
  symbol: string;
  name: string;
  category: 'crypto' | 'forex' | 'stocks' | 'commodities';
  tvSymbol: string;
  basePrice: number;
}> = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'crypto', tvSymbol: 'BINANCE:BTCUSDT', basePrice: 96450 },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'crypto', tvSymbol: 'BINANCE:ETHUSDT', basePrice: 2750 },
  { symbol: 'SOLUSDT', name: 'Solana', category: 'crypto', tvSymbol: 'BINANCE:SOLUSDT', basePrice: 195.4 },
  { symbol: 'XRPUSDT', name: 'Ripple', category: 'crypto', tvSymbol: 'BINANCE:XRPUSDT', basePrice: 2.45 },
  { symbol: 'BNBUSDT', name: 'BNB', category: 'crypto', tvSymbol: 'BINANCE:BNBUSDT', basePrice: 660 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'crypto', tvSymbol: 'BINANCE:DOGEUSDT', basePrice: 0.265 },
  { symbol: 'SUIUSDT', name: 'Sui', category: 'crypto', tvSymbol: 'BINANCE:SUIUSDT', basePrice: 3.42 },
  { symbol: 'PEPEUSDT', name: 'Pepe', category: 'crypto', tvSymbol: 'BINANCE:PEPEUSDT', basePrice: 0.0000098 },
  { symbol: 'XAUUSD', name: 'Gold / طلا جهانی', category: 'commodities', tvSymbol: 'OANDA:XAUUSD', basePrice: 2910 },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'forex', tvSymbol: 'FX:EURUSD', basePrice: 1.045 },
  { symbol: 'NVDA', name: 'NVIDIA Corp', category: 'stocks', tvSymbol: 'NASDAQ:NVDA', basePrice: 138.5 },
  { symbol: 'TSLA', name: 'Tesla Inc', category: 'stocks', tvSymbol: 'NASDAQ:TSLA', basePrice: 345.2 },
];

export async function fetchLiveMarketData(symbol: string): Promise<LiveTickerData> {
  const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Try Binance API for crypto symbols
  if (cleanSymbol.endsWith('USDT') || cleanSymbol.endsWith('BTC') || cleanSymbol.endsWith('USD')) {
    try {
      const binanceSymbol = cleanSymbol.endsWith('USDT') ? cleanSymbol : `${cleanSymbol}USDT`;
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.lastPrice);
        const change24h = parseFloat(data.priceChangePercent);
        const high24h = parseFloat(data.highPrice);
        const low24h = parseFloat(data.lowPrice);
        const volume24h = (parseFloat(data.quoteVolume) / 1_000_000).toFixed(1) + 'M $';

        return generateTickerWithIndicators(cleanSymbol, cleanSymbol, 'crypto', `BINANCE:${cleanSymbol}`, price, change24h, high24h, low24h, volume24h, true);
      }
    } catch {
      // Fallback below
    }
  }

  // Find in predefined presets or generate realistic market dynamic
  const found = POPULAR_MARKETS.find(m => m.symbol.toUpperCase() === cleanSymbol || cleanSymbol.includes(m.symbol));
  if (found) {
    const variation = (Math.sin(Date.now() / 60000) * 0.008);
    const price = found.basePrice * (1 + variation);
    const change24h = Number(((variation * 100) + (found.symbol === 'BTCUSDT' ? 2.4 : 1.2)).toFixed(2));
    const high24h = price * 1.03;
    const low24h = price * 0.97;
    const volume24h = '450.2M $';

    return generateTickerWithIndicators(found.symbol, found.name, found.category, found.tvSymbol, price, change24h, high24h, low24h, volume24h, false);
  }

  // Generic fallback
  const defaultPrice = 100;
  return generateTickerWithIndicators(cleanSymbol, cleanSymbol, 'crypto', `BINANCE:${cleanSymbol}`, defaultPrice, 1.5, defaultPrice * 1.04, defaultPrice * 0.96, '50M $', false);
}

function generateTickerWithIndicators(
  symbol: string,
  name: string,
  category: 'crypto' | 'forex' | 'stocks' | 'commodities',
  tvSymbol: string,
  price: number,
  change24h: number,
  high24h: number,
  low24h: number,
  volume24h: string,
  isLiveFeed: boolean = false
): LiveTickerData {
  const rsi = Math.round(35 + (Math.sin(Date.now() / 15000) * 25) + (change24h > 0 ? 15 : -10));
  const boundedRsi = Math.max(15, Math.min(85, rsi));
  
  const step = price > 1000 ? 50 : price > 10 ? 0.5 : 0.001;
  const ema20 = price * (1 - (change24h > 0 ? 0.006 : -0.006));
  const ema50 = price * (1 - (change24h > 0 ? 0.015 : -0.015));
  const ema200 = price * (1 - (change24h > 0 ? 0.04 : -0.04));
  const atr = price * 0.018;

  const support1 = Number((price * 0.975).toFixed(price > 10 ? 2 : 6));
  const support2 = Number((price * 0.948).toFixed(price > 10 ? 2 : 6));
  const resistance1 = Number((price * 1.028).toFixed(price > 10 ? 2 : 6));
  const resistance2 = Number((price * 1.055).toFixed(price > 10 ? 2 : 6));

  return {
    symbol,
    name,
    category,
    price: Number(price.toFixed(price > 10 ? 2 : 6)),
    change24h,
    high24h: Number(high24h.toFixed(price > 10 ? 2 : 6)),
    low24h: Number(low24h.toFixed(price > 10 ? 2 : 6)),
    volume24h,
    tvSymbol,
    isLiveFeed,
    lastUpdated: Date.now(),
    indicators: {
      rsi14: boundedRsi,
      macd: {
        line: Number((price * 0.002).toFixed(2)),
        signal: Number((price * 0.0015).toFixed(2)),
        hist: Number((change24h > 0 ? 1.2 : -1.2).toFixed(2)),
      },
      ema20: Number(ema20.toFixed(price > 10 ? 2 : 6)),
      ema50: Number(ema50.toFixed(price > 10 ? 2 : 6)),
      ema200: Number(ema200.toFixed(price > 10 ? 2 : 6)),
      atr: Number(atr.toFixed(price > 10 ? 2 : 6)),
      support1,
      support2,
      resistance1,
      resistance2,
    },
  };
}
