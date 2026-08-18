import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  timeframe?: string;
  theme?: 'dark' | 'light';
  height?: number | string;
}

const mapTimeframeToTv = (tf?: string): string => {
  switch (tf) {
    case '1m': return '1';
    case '5m': return '5';
    case '15m': return '15';
    case '1h': return '60';
    case '4h': return '240';
    case '1D': return 'D';
    default: return '15';
  }
};

const mapSymbolToTv = (sym: string): string => {
  const s = sym.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s === 'XAUUSD' || s === 'GOLD') return 'OANDA:XAUUSD';
  if (s === 'EURUSD') return 'FX:EURUSD';
  if (s === 'GBPUSD') return 'FX:GBPUSD';
  if (s === 'NVDA') return 'NASDAQ:NVDA';
  if (s === 'TSLA') return 'NASDAQ:TSLA';
  if (s === 'AAPL') return 'NASDAQ:AAPL';
  if (s.endsWith('USDT')) return `BINANCE:${s}`;
  if (s.endsWith('USD')) return `BINANCE:${s}T`;
  return `BINANCE:${s}USDT`;
};

export const TradingViewWidget = memo(({
  symbol,
  timeframe = '15m',
  theme = 'dark',
  height = '100%',
}: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef(`tv_chart_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined' && container) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: mapSymbolToTv(symbol),
          interval: mapTimeframeToTv(timeframe),
          timezone: 'Asia/Tehran',
          theme: theme,
          style: '1',
          locale: 'fa_IR',
          toolbar_bg: '#090d16',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: widgetId.current,
          studies: [
            'RSI@tv-basicstudies',
            'MASimple@tv-basicstudies',
            'MACD@tv-basicstudies',
          ],
          disabled_features: ['header_saveload'],
          enabled_features: ['study_templates'],
          overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#10b981',
            'mainSeriesProperties.candleStyle.downColor': '#f43f5e',
            'mainSeriesProperties.candleStyle.drawWick': true,
            'mainSeriesProperties.candleStyle.drawBorder': true,
            'mainSeriesProperties.candleStyle.borderColor': '#374151',
            'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
            'mainSeriesProperties.candleStyle.borderDownColor': '#f43f5e',
            'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
            'mainSeriesProperties.candleStyle.wickDownColor': '#f43f5e',
            'paneProperties.background': '#030712',
            'paneProperties.vertGridProperties.color': '#111827',
            'paneProperties.horzGridProperties.color': '#111827',
          },
        });
      }
    };

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, timeframe, theme]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl">
      <div id={widgetId.current} ref={containerRef} className="w-full h-full min-h-[480px]" style={{ height }} />
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
