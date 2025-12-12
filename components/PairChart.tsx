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
        <div className="levels-grid">
          <div className="level-card">
            <span className="label">Entry</span>
            <strong>{formatter.format(coin.entry)} IDR</strong>
          </div>
          <div className="level-card">
            <span className="label">SL</span>
            <strong className="danger-text">{formatter.format(coin.sl)} IDR</strong>
            <small>Risk ~{coin.slFromEntryPct.toFixed(1)}%</small>
          </div>
          <div className="level-card">
            <span className="label">TP 1</span>
            <strong>{formatter.format(coin.tp1)} IDR</strong>
            <small>+{coin.tp1FromEntryPct.toFixed(1)}%</small>
          </div>
          <div className="level-card">
            <span className="label">TP 2</span>
            <strong>{formatter.format(coin.tp2)} IDR</strong>
            <small>+{coin.tp2FromEntryPct.toFixed(1)}%</small>
          </div>
          <div className="level-card">
            <span className="label">TP 3</span>
            <strong>{formatter.format(coin.tp3)} IDR</strong>
            <small>+{coin.tp3FromEntryPct.toFixed(1)}%</small>
          </div>
          <div className="level-card">
            <span className="label">Last</span>
            <strong>{formatter.format(last)} IDR</strong>
            <small>RR {coin.rr.toFixed(2)}</small>
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
