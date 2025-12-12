'use client';

import { useCallback, useEffect, useState } from 'react';
import PairChart from '../components/PairChart';
import CoinTable from '../components/CoinTable';
import type { CoinSignal } from '../lib/sintaLogic';

interface ApiResponse {
  coins: CoinSignal[];
}

const formatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
});

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
      setCoins(data.coins || []);
      setSelected((prev) => {
        if (!prev && data.coins && data.coins.length > 0) {
          return data.coins[0];
        }

        if (prev && data.coins) {
          const updated = data.coins.find((c) => c.pair === prev.pair);
          return updated ?? data.coins[0] ?? null;
        }

        return prev ?? null;
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

  const strongAndBuy = coins.filter(
    (c) => c.signal === 'strong_buy' || c.signal === 'buy'
  );
  const watchList = coins.filter((c) => c.signal === 'watch');
  const pumpList = coins.filter((c) => c.pumpStatus === 'mau_pump');

  const pumpWarnings = pumpList.map((c) => {
    let status = 'Momentum awal';
    let note = 'Belum terlalu tinggi, masih ada ruang masuk bertahap.';

    if (c.posInRange >= 0.9) {
      status = 'Dekat puncak!';
      note = 'Rawan koreksi/CL, wajib disiplin SL & take profit cepat.';
    } else if (c.posInRange >= 0.75) {
      status = 'Momentum jalan';
      note = 'Pertimbangkan TP1/TP2, jaga trailing agar tidak ketinggalan.';
    } else if (c.moveFromLowPct >= 25) {
      status = 'Sudah kencang';
      note = 'Hindari FOMO, tunggu retest atau gunakan TP cepat.';
    }

    return {
      pair: c.pair,
      status,
      note,
      move: c.moveFromLowPct,
      rr: c.rr,
    };
  });

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
            <h3>Koin siap-siap BUY (watchlist)</h3>
            {watchList.length === 0 ? (
              <p className="muted">Belum ada koin yang masuk kategori siap-siap BUY.</p>
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
                      <span className="badge badge-watch">Siap-siap BUY</span>
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
            <h3>Koin mau pump (momentum)</h3>
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
                      Naik dari low 24j ~{c.moveFromLowPct.toFixed(1)}% · RR {c.rr.toFixed(2)}
                    </div>
                    <div className="levels-chips">
                      <span className="chip">Entry {formatter.format(c.entry)}</span>
                      <span className="chip">TP1 {formatter.format(c.tp1)}</span>
                      <span className="chip">TP2 {formatter.format(c.tp2)}</span>
                      <span className="chip">SL {formatter.format(c.sl)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>

      <section className="table-section">
        <div className="warning-strip">
          <div>
            <h4>Radar Peringatan Pump</h4>
            <p className="muted">
              Update cepat koin yang baru masuk kategori pump supaya tidak ketinggalan momentum atau terjebak CL.
            </p>
          </div>
          <div className="warning-list">
            {pumpWarnings.length === 0 ? (
              <span className="muted">Belum ada peringatan pump.</span>
            ) : (
              pumpWarnings.map((w) => (
                <div key={w.pair} className="warning-card">
                  <div className="warning-head">
                    <strong>{w.pair.toUpperCase()}</strong>
                    <span className="badge badge-pump">{w.status}</span>
                  </div>
                  <p className="warning-note">{w.note}</p>
                  <div className="warning-meta">
                    <span>+{w.move.toFixed(1)}% dari low 24j</span>
                    <span>R:R {w.rr.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <h2>Daftar koin STRONG BUY & BUY (swing)</h2>
        <CoinTable
          coins={strongAndBuy}
          selectedPair={selected?.pair ?? null}
          onSelectCoin={setSelected}
        />
      </section>
    </main>
  );
}
