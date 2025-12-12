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
        throw new Error(`Gagal mengambil data (${res.status})`);
      }
      const data: ApiResponse = await res.json();
      const incomingCoins = data.coins || [];
      setCoins(incomingCoins);

      const pumpCandidates = incomingCoins.filter((c) => c.pumpStatus === 'mau_pump');

      setSelected((prev) => {
        if (!prev && pumpCandidates.length > 0) {
          return pumpCandidates[0];
        }

        if (prev) {
          const updated = pumpCandidates.find((c) => c.pair === prev.pair);
          return updated ?? pumpCandidates[0] ?? null;
        }

        return pumpCandidates[0] ?? null;
      });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pumpList = coins.filter((c) => c.pumpStatus === 'mau_pump');

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>SINTA Crypto Detector</h1>
          <p className="subtitle">
            Screening koin Indodax untuk swing trading (TP besar, tahan beberapa hari).
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="button"
          >
            {loading ? 'Memuat...' : 'Refresh data'}
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
                <h3>Alasan Sinyal</h3>
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
                ? 'Mengambil data koin...'
                : 'Belum ada koin yang dipilih / sinyal belum tersedia.'}
            </div>
          )}
        </div>

        <div className="right-panel">
          <section className="side-section">
            <h3>Fokus: Koin mau pump (momentum)</h3>
            {pumpList.length === 0 ? (
              <p className="muted">Belum ada koin yang terdeteksi mau pump.</p>
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
                      <span className="badge badge-pump">Mau pump</span>
                    </div>
                    <div className="side-list-sub">
                      Naik dari low 24j ~{c.moveFromLowPct.toFixed(1)}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>

      <section className="table-section">
        <h2>Daftar koin mau pump</h2>
        <CoinTable
          coins={pumpList}
          selectedPair={selected?.pair ?? null}
          onSelectCoin={setSelected}
        />
      </section>
    </main>
  );
}
