'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface TradingViewChartProps {
  pair: string;
  symbol?: string;
  interval?: string;
}

declare global {
  interface Window {
    TradingView?: any;
  }
}

export default function TradingViewChart({ pair, symbol, interval = '60' }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const widgetId = useMemo(() => `tv-${pair.replace(/[^a-zA-Z0-9]/g, '-')}-${Math.random().toString(36).slice(2, 7)}`, [pair]);

  const resolvedSymbol = useMemo(() => {
    if (symbol) return symbol;
    const [asset, quote = 'USDT'] = pair.split('_');
    const assetSym = asset?.toUpperCase?.() ?? pair.toUpperCase();
    const quoteSym = quote?.toUpperCase?.() ?? 'USDT';

    // Default to most liquid feed (Binance USDT pair) to ensure TradingView data is available.
    return `BINANCE:${assetSym}${quoteSym === 'IDR' ? 'USDT' : quoteSym}`;
  }, [pair, symbol]);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return undefined;

    const loadWidget = () => {
      if (!window.TradingView) return;
      if (!containerEl) return;

      // Clear previous widget content if rerendered with new symbol.
      containerEl.innerHTML = `<div id="${widgetId}" style="height:400px;width:100%"></div>`;

      // eslint-disable-next-line no-new
      new window.TradingView.widget({
        autosize: true,
        symbol: resolvedSymbol,
        interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'id',
        hide_top_toolbar: true,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        backgroundColor: 'rgba(8, 47, 73, 0.5)',
        container_id: widgetId,
      });
      setReady(true);
    };

    if (window.TradingView) {
      loadWidget();
      return undefined;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = loadWidget;
    document.body.appendChild(script);

    return () => {
      setReady(false);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (containerEl) {
        containerEl.innerHTML = '';
      }
    };
  }, [interval, resolvedSymbol, widgetId]);

  return (
    <div className="tv-chart-wrapper">
      {!ready && <div className="tv-chart-placeholder">Memuat chart TradingView...</div>}
      <div ref={containerRef} className="tv-chart" />
    </div>
  );
}
