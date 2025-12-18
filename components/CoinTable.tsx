'use client';

import type { CoinSignal } from '../lib/sintaLogic';

interface Props {
  coins: CoinSignal[];
  selectedPair: string | null;
  onSelectCoin: (coin: CoinSignal) => void;
}

const formatter = new Intl.NumberFormat('en-US', {
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
        No coins meet the STRONG BUY / BUY criteria yet.
      </p>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="coin-table">
        <thead>
          <tr>
            <th>Pair</th>
            <th>Signal</th>
            <th>Phase</th>
            <th>Status</th>
            <th>Last</th>
            <th>Entry</th>
            <th>TP</th>
            <th>SL</th>
            <th>TP %</th>
            <th>SL %</th>
            <th>R:R</th>
            <th>24h Volume (IDR)</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => {
            const isSelected = selectedPair === coin.pair;
            const phaseLabel =
              coin.pricePhase === 'starting_to_rise'
                ? 'Starting to rise'
                : coin.pricePhase === 'already_run_up'
                ? 'Already run up'
                : 'Normal';

            let statusLabel = '';
            if (coin.pumpStatus === 'potential_pump') {
              statusLabel = 'Likely to pump';
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
                <td>{formatter.format(coin.entry)}</td>
                <td>{formatter.format(coin.tp)}</td>
                <td>{formatter.format(coin.sl)}</td>
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
