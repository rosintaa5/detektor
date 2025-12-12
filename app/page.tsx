'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  label: string;
  note: string;
}

export default function HomePage() {
  const [coins, setCoins] = useState<CoinSignal[]>([]);
  const [selected, setSelected] = useState<CoinSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<PumpWarning[]>([]);
  const lastWarningStateRef = useRef<Map<string, string>>(new Map());

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 2,
      }),
    []
  );

  const formatPrice = useCallback((value: number) => formatter.format(value), [formatter]);

  const buildWarningGuidance = useCallback(
    (coin: CoinSignal) => {
      const { entry, tp, sl, last } = coin;

      const nearTp = last >= tp * 0.97 && last < tp * 1.03;
      const hitTp = last >= tp * 1.03;
      const nearEntry = last >= entry * 0.97 && last <= entry * 1.04;
      const aboveEntry = last > entry * 1.04;
      const nearSl = last <= sl * 1.03;

      if (nearSl) {
        return {
          key: 'cl',
          label: 'CL / Risk Alert',
          note: `Harga mendekati/turun ke area SL ${formatPrice(sl)}. Jika tidak bertahan, disiplin CL agar tidak makin dalam.`,
        };
      }

      if (hitTp) {
        return {
          key: 'tp_full',
          label: 'TP Semua',
          note: `TP ${formatPrice(tp)} sudah tersentuh. Amankan profit dan hindari entry baru sampai ada setup ulang.`,
        };
      }

      if (nearTp) {
        return {
          key: 'tp_partial',
          label: 'TP Sebagian',
          note: `Harga mendekati TP ${formatPrice(tp)}. Realisasikan sebagian, sisanya biarkan mengalir jika volume masih kuat.`,
        };
      }

      if (aboveEntry) {
        return {
          key: 'no_entry',
          label: 'Tahan Entry Baru',
          note: `Momentum sudah jalan di atas entry ${formatPrice(entry)}. Jangan kejar-kejaran, fokus kelola posisi dan siapkan TP di ${formatPrice(tp)}.`,
        };
      }

      if (nearEntry) {
        return {
          key: 'entry_zone',
          label: 'Area Entry',
          note: `Harga masih sekitar entry ${formatPrice(entry)}. Bisa cicil, tapi tetap disiplin SL ${formatPrice(sl)} dan target TP ${formatPrice(tp)}.`,
        };
      }

      return {
        key: 'wait',
        label: 'Tunggu Momentum',
        note: `Belum menyentuh area entry ${formatPrice(entry)}. Sabar tunggu konfirmasi sebelum entry dan bidik TP di ${formatPrice(tp)}.`,
      };
    },
    [formatPrice]
  );

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

      const now = Date.now();
      const pumpPairs = new Set(pumpCandidates.map((c) => c.pair));

      lastWarningStateRef.current.forEach((_, pair) => {
        if (!pumpPairs.has(pair)) {
          lastWarningStateRef.current.delete(pair);
        }
      });

      setWarnings((prev) => {
        const retentionMs = 30 * 60 * 1000;
        const stillFresh = prev.filter((item) => now - item.time < retentionMs);
        const updates: PumpWarning[] = [];

        pumpCandidates.forEach((coin) => {
          const guidance = buildWarningGuidance(coin);
          const lastKey = lastWarningStateRef.current.get(coin.pair);

          if (lastKey !== guidance.key) {
            updates.push({
              pair: coin.pair,
              moveFromLowPct: coin.moveFromLowPct,
              volIdr: coin.volIdr,
              time: now,
              label: guidance.label,
              note: guidance.note,
            });
            lastWarningStateRef.current.set(coin.pair, guidance.key);
          }
        });

        const combined = [...stillFresh, ...updates];
        const maxItems = 40;
        if (combined.length > maxItems) {
          return combined.slice(combined.length - maxItems);
        }
        return combined;
      });

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
  }, [buildWarningGuidance]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const retentionMs = 30 * 60 * 1000;
      setWarnings((prev) => prev.filter((item) => now - item.time < retentionMs));
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

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
                  <span className="badge badge-pump">{warn.label}</span>
                </div>
                <div className="side-list-sub">
                  {warn.note}
                </div>
                <div className="side-list-sub muted">
                  Naik dari low 24j ~{warn.moveFromLowPct.toFixed(1)}% • Volume {formatter.format(warn.volIdr)} IDR
                </div>
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
