'use client';

import { useCallback, useEffect, useState } from 'react';
import PairChart from '../components/PairChart';
import CoinTable from '../components/CoinTable';
import type { CoinSignal } from '../lib/sintaLogic';

interface ApiResponse {
  coins: CoinSignal[];
}

export default function HomePage() {
  const [coins, setCoins] = useState<CoinSignal[]>([]);
  const [selected, setSelected] = useState<CoinSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/tickers');
      if (!res.ok) {
        throw new Error(`Failed to fetch data (${res.status})`);
      }
      const data: ApiResponse = await res.json();
      setCoins(data.coins || []);
      setSelected((prevSelected) => {
        if ((!prevSelected || !data.coins) && data.coins && data.coins.length > 0) {
          return data.coins[0];
        }

        if (prevSelected && data.coins) {
          const updated = data.coins.find((c) => c.pair === prevSelected.pair);
          return updated ?? data.coins[0] ?? null;
        }

        return prevSelected ?? null;
      });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const strongAndBuy = coins.filter(
    (c) => c.signal === 'strong_buy' || c.signal === 'buy'
  );
  const watchList = coins.filter((c) => c.signal === 'watch');
  const pumpList = coins.filter((c) => c.pumpStatus === 'potential_pump');

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>SINTA Crypto Detector</h1>
          <p className="subtitle">
            Screening Indodax coins for swing trading (bigger TP, held for several days).
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="button"
          >
            {loading ? 'Loading...' : 'Refresh data'}
          </button>
        </div>
      </header>

      {error && <div className="error-box">Error: {error}</div>}

      <section className="top-layout">
        <div className="left-panel">
          {selected ? (
            <>
              <PairChart coin={selected} />
              <div className="reasons-box">
                <h3>Signal reasons</h3>
                <ul>
                  {selected.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="empty-state">
              {loading
                ? 'Fetching coin data...'
                : 'No coin selected yet / signals are not available.'}
            </div>
          )}
        </div>

        <div className="right-panel">
          <section className="side-section">
            <h3>Coins preparing for BUY (watchlist)</h3>
            {watchList.length === 0 ? (
              <p className="muted">No coins are in the preparing-to-BUY category yet.</p>
            ) : (
              <ul className="side-list">
                {watchList.map((c) => (
                  <li
                    key={c.pair}
                    className={`side-list-item ${
                      selected?.pair === c.pair ? 'active' : ''
                    }`}
                    onClick={() => setSelected(c)}
                  >
                    <div className="side-list-title">
                      <span>{c.pair.toUpperCase()}</span>
                      <span className="badge badge-watch">Preparing for BUY</span>
                    </div>
                    <div className="side-list-sub">
                      TP ~{c.tpFromEntryPct.toFixed(1)}% · R:R {c.rr.toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="side-section">
            <h3>Coins likely to pump (momentum)</h3>
            {pumpList.length === 0 ? (
              <p className="muted">No coins detected as likely to pump.</p>
            ) : (
              <ul className="side-list">
                {pumpList.map((c) => (
                  <li
                    key={c.pair}
                    className={`side-list-item ${
                      selected?.pair === c.pair ? 'active' : ''
                    }`}
                    onClick={() => setSelected(c)}
                  >
                    <div className="side-list-title">
                      <span>{c.pair.toUpperCase()}</span>
                      <span className="badge badge-pump">Likely to pump</span>
                    </div>
                    <div className="side-list-sub">
                      Up from 24h low by ~{c.moveFromLowPct.toFixed(1)}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>

      <section className="table-section">
        <h2>List of STRONG BUY & BUY coins (swing)</h2>
        <CoinTable
          coins={strongAndBuy}
          selectedPair={selected?.pair ?? null}
          onSelectCoin={setSelected}
        />
      </section>
    </main>
  );
}
