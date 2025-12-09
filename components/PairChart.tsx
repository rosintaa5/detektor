'use client';

import type { CoinSignal } from '../lib/sintaLogic';

interface Props {
  coin: CoinSignal;
}

const formatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
});

export default function PairChart({ coin }: Props) {
  const { pair, last, high, low, posInRange } = coin;

  const widthPct = Math.max(0, Math.min(100, posInRange * 100));

  return (
    <section className="chart-section">
      <header className="chart-header">
        <div>
          <h2>{pair.toUpperCase()}</h2>
          <p className="chart-subtitle">
            Range 24 jam: low {formatter.format(low)} → high {formatter.format(high)} · harga
            sekarang {formatter.format(last)}
          </p>
        </div>
        <div className="chart-price-info">
          <div className="chart-price-line">
            <span className="label">Last</span>
            <span>{formatter.format(last)} IDR</span>
          </div>
          <div className="chart-price-line">
            <span className="label">Entry</span>
            <span>{formatter.format(coin.entry)} IDR</span>
          </div>
          <div className="chart-price-line">
            <span className="label">TP</span>
            <span>{formatter.format(coin.tp)} IDR</span>
          </div>
          <div className="chart-price-line">
            <span className="label">SL</span>
            <span>{formatter.format(coin.sl)} IDR</span>
          </div>
        </div>
      </header>

      <div className="range-bar-wrapper">
        <div className="range-bar">
          <div className="range-bar-fill" style={{ width: `${widthPct}%` }} />
          <div className="range-bar-marker" style={{ left: `${widthPct}%` }} />
        </div>
        <div className="range-bar-labels">
          <span>Low</span>
          <span>Posisi harga: {widthPct.toFixed(1)}%</span>
          <span>High</span>
        </div>
      </div>
    </section>
  );
}
