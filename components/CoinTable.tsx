'use client';

import type { CoinSignal } from '../lib/sintaLogic';

interface Props {
  coins: CoinSignal[];
  selectedPair: string | null;
  onSelectCoin: (coin: CoinSignal) => void;
}

const formatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
});

function signalLabel(signal: CoinSignal['signal']): string {
  if (signal === 'strong_buy') return 'STRONG BUY';
  if (signal === 'buy') return 'BUY';
  if (signal === 'watch') return 'Watchlist';
  return '-';
}

export default function CoinTable({ coins, selectedPair, onSelectCoin }: Props) {
  if (coins.length === 0) {
    return (
      <p className="muted">
        Belum ada koin yang memenuhi kriteria STRONG BUY / BUY.
      </p>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="coin-table">
        <thead>
          <tr>
            <th>Pair</th>
            <th>Sinyal</th>
            <th>Fase</th>
            <th>Status</th>
            <th>Last</th>
            <th>Entry / SL</th>
            <th>TP 1</th>
            <th>TP 2</th>
            <th>TP 3</th>
            <th>TP %</th>
            <th>SL %</th>
            <th>R:R</th>
            <th>Volume 24j (IDR)</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => {
            const isSelected = selectedPair === coin.pair;
            const phaseLabel =
              coin.pricePhase === 'baru_mau_naik'
                ? 'Baru mau naik'
                : coin.pricePhase === 'sudah_telanjur_naik'
                ? 'Sudah telanjur naik'
                : 'Normal';

            let statusLabel = '';
            if (coin.pumpStatus === 'mau_pump') {
              statusLabel = 'Mau pump';
            }

            return (
              <tr
                key={coin.pair}
                className={isSelected ? 'row-selected' : ''}
                onClick={() => onSelectCoin(coin)}
              >
                <td>{coin.pair.toUpperCase()}</td>
                <td>
                  <span
                    className={
                      coin.signal === 'strong_buy'
                        ? 'badge badge-strong'
                        : coin.signal === 'buy'
                        ? 'badge badge-buy'
                        : 'badge'
                    }
                  >
                    {signalLabel(coin.signal)}
                  </span>
                </td>
                <td>{phaseLabel}</td>
                <td>
                  {statusLabel ? (
                    <span className="badge badge-pump">{statusLabel}</span>
                  ) : (
                    '—'
                )}
              </td>
              <td>{formatter.format(coin.last)}</td>
              <td className="compact-cell">
                <div className="stacked">
                  <span>Entry {formatter.format(coin.entry)}</span>
                  <span className="danger-text">SL {formatter.format(coin.sl)}</span>
                </div>
              </td>
              <td className="compact-cell">
                <div className="stacked">
                  <span>{formatter.format(coin.tp1)}</span>
                  <small>+{coin.tp1FromEntryPct.toFixed(1)}%</small>
                </div>
              </td>
              <td className="compact-cell">
                <div className="stacked">
                  <span>{formatter.format(coin.tp2)}</span>
                  <small>+{coin.tp2FromEntryPct.toFixed(1)}%</small>
                </div>
              </td>
              <td className="compact-cell">
                <div className="stacked">
                  <span>{formatter.format(coin.tp3)}</span>
                  <small>+{coin.tp3FromEntryPct.toFixed(1)}%</small>
                </div>
              </td>
              <td>{coin.tpFromEntryPct.toFixed(1)}%</td>
              <td>{coin.slFromEntryPct.toFixed(1)}%</td>
              <td>{coin.rr.toFixed(2)}</td>
              <td>{formatter.format(coin.volIdr)}</td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
