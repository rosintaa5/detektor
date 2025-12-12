'use client';

import { useCallback, useEffect, useState } from 'react';
import PairChart from '../components/PairChart';
import CoinTable from '../components/CoinTable';
import type { CoinSignal } from '../lib/sintaLogic';

interface ApiResponse {
  coins: CoinSignal[];
}

interface PumpWarning {
  pair: string;
  moveFromLowPct: number;
  volIdr: number;
  time: number;
}

export default function HomePage() {
  const [coins, setCoins] = useState<CoinSignal[]>([]);
  const [selected, setSelected] = useState<CoinSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<PumpWarning[]>([]);
  const pumpSeenRef = useState<Set<string>>(() => new Set())[0];

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

      const newlyPump = pumpCandidates.filter((coin) => !pumpSeenRef.has(coin.pair));
      if (newlyPump.length > 0) {
        const now = Date.now();
        setWarnings((prev) => {
          const stillFresh = prev.filter((item) => now - item.time < 5 * 60 * 1000);
          const incoming = newlyPump.map((coin) => ({
            pair: coin.pair,
            moveFromLowPct: coin.moveFromLowPct,
            volIdr: coin.volIdr,
            time: now,
          }));
          return [...stillFresh, ...incoming];
        });
      }

      pumpSeenRef.clear();
      pumpCandidates.forEach((coin) => pumpSeenRef.add(coin.pair));

      setSelected((prev) => {
        if (!prev) return null;

        const updated = pumpCandidates.find((c) => c.pair === prev.pair);
        return updated ?? null;
      });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  }, [pumpSeenRef]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setWarnings((prev) => prev.filter((item) => now - item.time < 5 * 60 * 1000));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatter = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  });

  const computeTpTargets = (coin: CoinSignal) => {
    const diff = coin.tp - coin.entry;
    const tp1 = coin.entry + diff * 0.4;
    const tp2 = coin.entry + diff * 0.7;
    const tp3 = coin.tp;

    return [tp1, tp2, tp3].map((tp) => ({
      price: tp,
      pct: ((tp - coin.entry) / coin.entry) * 100,
    }));
  };

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

      <section className="side-section">
        <h3>Radar Peringatan Pump</h3>
        {warnings.length === 0 ? (
          <p className="muted">Belum ada peringatan baru. Periksa secara berkala agar tidak ketinggalan momentum.</p>
        ) : (
          <ul className="side-list">
            {warnings.map((warn) => (
              <li key={`${warn.pair}-${warn.time}`} className="side-list-item">
                <div className="side-list-title">
                  <span>{warn.pair.toUpperCase()}</span>
                  <span className="badge badge-pump">Masuk radar</span>
                </div>
                <div className="side-list-sub">
                  Naik dari low 24j ~{warn.moveFromLowPct.toFixed(1)}% • Volume {formatter.format(warn.volIdr)} IDR
                </div>
                <div className="side-list-sub muted">Segera cek momentum agar tidak terjebak CL.</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="side-section">
        <h3>Daftar koin mau pump</h3>
        <p className="muted">Klik koin untuk menampilkan detail, chart, dan TP 1/2/3 di bawah.</p>
        {pumpList.length === 0 ? (
          <p className="muted">Belum ada koin yang terdeteksi mau pump.</p>
        ) : (
          <ul className="side-list">
            {pumpList.map((c) => (
              <li
                key={c.pair}
                className={`side-list-item ${selected?.pair === c.pair ? 'active' : ''}`}
                onClick={() => setSelected(c)}
              >
                <div className="side-list-title">
                  <span>{c.pair.toUpperCase()}</span>
                  <span className="badge badge-pump">Mau pump</span>
                </div>
                <div className="side-list-sub">Naik dari low 24j ~{c.moveFromLowPct.toFixed(1)}%</div>
              </li>
            ))}
          </ul>
        )}
      </section>

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

              <div className="reasons-box">
                <h3>TP 1, 2, 3</h3>
                <ul className="tp-list">
                  {computeTpTargets(selected).map((tp, idx) => (
                    <li key={idx}>
                      TP {idx + 1}: {formatter.format(tp.price)} ({tp.pct.toFixed(1)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="empty-state">
              {loading
                ? 'Mengambil data koin...'
                : 'Klik salah satu koin mau pump di atas untuk melihat detail.'}
            </div>
          )}
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
