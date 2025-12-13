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
  const normalizedPair = useMemo(() => normalizePair(pair), [pair]);
  const chartSrc = useMemo(
    () => `https://www.indodax.com/chart/${normalizedPair}`,
    [normalizedPair],
  );

  return (
    <div className="indodax-chart-wrapper" style={{ minHeight: height }}>
      {!loaded && <div className="indodax-chart-placeholder">Memuat chart Indodax...</div>}
      <iframe
        key={chartSrc}
        src={chartSrc}
        title={`Chart Indodax ${pair}`}
        className="indodax-chart"
        onLoad={() => setLoaded(true)}
        allowFullScreen
      />
      <div className="indodax-chart-footer">Data live langsung dari Indodax untuk akurasi harga dan volume.</div>
    </div>
  );
}
