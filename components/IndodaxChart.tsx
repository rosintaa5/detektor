'use client';

import { useMemo, useState } from 'react';

interface IndodaxChartProps {
  pair: string;
  height?: number;
}

function normalizePair(pair: string) {
  // Convert formats like "btc_idr" or "BTC/IDR" into "btcidr" for Indodax chart path.
  return pair.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export default function IndodaxChart({ pair, height = 400 }: IndodaxChartProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const normalizedPair = useMemo(() => normalizePair(pair), [pair]);
  const tvSymbol = useMemo(() => normalizedPair.toUpperCase(), [normalizedPair]);
  const chartSrc = useMemo(() => {
    const params = new URLSearchParams({
      frameElementId: `tv_${tvSymbol}`,
      symbol: `INDODAX:${tvSymbol}`,
      interval: '30',
      hidesidetoolbar: '1',
      hide_side_toolbar: '1',
      hide_legend: '1',
      symboledit: '1',
      saveimage: '0',
      studies: '',
      theme: 'dark',
      style: '3',
      timezone: 'Asia/Jakarta',
      withdateranges: '1',
      hide_volume: '0',
      allow_symbol_change: '1',
      hideideas: '1',
      locale: 'en',
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol]);

  return (
    <div className="indodax-chart-wrapper" style={{ minHeight: height }}>
      {!loaded && !hasError && (
        <div className="indodax-chart-placeholder">Loading Indodax chart...</div>
      )}
      {hasError && (
        <div className="indodax-chart-error">
          Chart embed failed to load. Open directly on{' '}
          <a href={`https://www.indodax.com/chart/${normalizedPair}`} target="_blank" rel="noreferrer">
            Indodax
          </a>{' '}
          to view the chart.
        </div>
      )}
      <iframe
        key={chartSrc}
        src={chartSrc}
        title={`Chart Indodax ${pair}`}
        className="indodax-chart"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="indodax-chart-footer">Live data direct from Indodax for accurate price and volume.</div>
    </div>
  );
}
