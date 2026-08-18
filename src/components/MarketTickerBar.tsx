import React from 'react';
import { MarketTicker } from '../types';
import { TrendingUp, TrendingDown, Zap, Compass, Coins, CircleDollarSign } from 'lucide-react';

interface MarketTickerBarProps {
  tickers: MarketTicker[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const MarketTickerBar: React.FC<MarketTickerBarProps> = ({
  tickers,
  activeSymbol,
  onSelectSymbol,
  selectedCategory,
  onSelectCategory,
}) => {
  const filteredTickers = tickers.filter(
    (t) => selectedCategory === 'all' || t.category === selectedCategory
  );

  return (
    <div className="w-full bg-slate-900/90 border-y border-slate-800/80 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none text-xs">
          <button
            id="filter-all"
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            همه بازارها
          </button>
          <button
            id="filter-crypto"
            onClick={() => onSelectCategory('crypto')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'crypto'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            ارز دیجیتال (کریپتو)
          </button>
          <button
            id="filter-commodities"
            onClick={() => onSelectCategory('commodities')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'commodities'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CircleDollarSign className="w-3.5 h-3.5" />
            طلا و کالاها
          </button>
          <button
            id="filter-stocks"
            onClick={() => onSelectCategory('stocks')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'stocks'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            سهام و فارکس
          </button>
        </div>

        {/* Live Ticker Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto py-0.5 scrollbar-none">
          {filteredTickers.map((ticker) => {
            const isSelected = activeSymbol.toUpperCase() === ticker.symbol.toUpperCase();
            const isPositive = ticker.change24h >= 0;

            return (
              <button
                key={ticker.symbol}
                id={`ticker-${ticker.symbol}`}
                onClick={() => onSelectSymbol(ticker.symbol)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap text-xs ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/60 shadow-md text-slate-100 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-200">{ticker.symbol.replace('USDT', '')}</span>
                  <span className="mono-num text-slate-400 font-medium">
                    ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: ticker.price < 1 ? 4 : 2 })}
                  </span>
                </div>
                <span
                  className={`mono-num flex items-center gap-0.5 font-semibold text-[11px] px-1.5 py-0.5 rounded ${
                    isPositive ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? `+${ticker.change24h.toFixed(2)}%` : `${ticker.change24h.toFixed(2)}%`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
