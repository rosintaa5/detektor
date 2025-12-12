'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CoinTable from '../components/CoinTable';
import PairChart from '../components/PairChart';
import type { CoinSignal } from '../lib/sintaLogic';

interface ApiResponse {
  coins: CoinSignal[];
}

type PredictionDirection = 'bullish' | 'bearish' | 'netral';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  publishedAt: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  assets: string[];
  impact: 'high' | 'medium' | 'low';
}

interface NewsResponse {
  news: NewsItem[];
}

interface Prediction {
  asset: string;
  direction: PredictionDirection;
  confidence: number;
  rationale: string;
  suggestedAction: string;
  horizon: string;
}

interface PumpWarning {
  pair: string;
  moveFromLowPct: number;
  volIdr: number;
  last: number;
  entry: number;
  tp: number;
  sl: number;
  rr: number;
  time: number;
  label: string;
  note: string;
}

interface TopPick {
  pair: string;
  asset: string;
  score: number;
  entry: number;
  tp: number;
  sl: number;
  rr: number;
  last: number;
  direction: PredictionDirection;
  confidence: number;
  rationale: string;
  suggestedAction: string;
  horizon: string;
}

export default function HomePage() {
  const [coins, setCoins] = useState<CoinSignal[]>([]);
  const [selected, setSelected] = useState<CoinSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<PumpWarning[]>([]);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [news, setNews] = useState<NewsItem[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [newsError, setNewsError] = useState<string | null>(null);
  const lastWarningStateRef = useRef<Map<string, string>>(new Map());
  const trackedPairsRef = useRef<Map<string, number>>(new Map());

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 2,
      }),
    []
  );

  const usdFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }),
    []
  );

  const formatPrice = useCallback((value: number) => formatter.format(value), [formatter]);
  const formatUsd = useCallback((value: number) => usdFormatter.format(value), [usdFormatter]);

  const describeHorizonWindow = useCallback(
    (horizon: string) => {
      const matches = [...horizon.matchAll(/(\d+)\s*(hari|minggu)/gi)];

      let maxDays = 3;
      matches.forEach(([, num, unit]) => {
        const days = Number.parseInt(num, 10) * (unit.toLowerCase().startsWith('minggu') ? 7 : 1);
        if (!Number.isNaN(days) && days > maxDays) {
          maxDays = days;
        }
      });

      const until = new Date(nowTs + maxDays * 24 * 60 * 60 * 1000);
      const untilLabel = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
      }).format(until);

      return { maxDays, untilLabel: `sampai ${untilLabel}` };
    },
    [nowTs]
  );

  const formatRelativeTime = useCallback(
    (time: number) => {
      const diff = nowTs - time;
      if (diff < 0) return 'baru saja';

      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) return `${seconds}s lalu`;

      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m lalu`;

      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}j lalu`;

      const days = Math.floor(hours / 24);
      return `${days}h lalu`;
    },
    [nowTs]
  );

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

  const normalizeAssetFromPair = useCallback((pair: string) => {
    const [asset] = pair.split('_');
    return asset?.toUpperCase?.() ?? pair.toUpperCase();
  }, []);

  const buildWeeklyPredictions = useCallback(
    (coinList: CoinSignal[], newsList: NewsItem[]): Prediction[] => {
      if (coinList.length === 0 && newsList.length === 0) return [];

      const newsScore = new Map<string, { score: number; hits: number; impact: number }>();

      newsList.forEach((item) => {
        const sentimentScore = item.sentiment === 'bullish' ? 1 : item.sentiment === 'bearish' ? -1 : 0.2;
        const impactWeight = item.impact === 'high' ? 1.2 : item.impact === 'medium' ? 1 : 0.6;

        item.assets.forEach((asset) => {
          const key = asset.toUpperCase();
          const current = newsScore.get(key) ?? { score: 0, hits: 0, impact: 0 };
          newsScore.set(key, {
            score: current.score + sentimentScore * impactWeight,
            hits: current.hits + 1,
            impact: current.impact + impactWeight,
          });
        });
      });

      const predictionsMap = new Map<string, Prediction>();

      coinList.forEach((coin) => {
        const asset = normalizeAssetFromPair(coin.pair);
        const newsStats = newsScore.get(asset);

        const pumpBoost = coin.pumpStatus === 'mau_pump' ? 1 : 0;
        const rrBoost = Math.min(1, Math.max(0, (coin.rr - 1.5) / 2));
        const momentum = Math.min(1, coin.moveFromLowPct / 30);

        const baseScore = (newsStats?.score ?? 0) + pumpBoost + rrBoost + momentum;

        const direction: PredictionDirection =
          baseScore >= 1.5 ? 'bullish' : baseScore <= -0.6 ? 'bearish' : 'netral';

        const confidence = Math.min(100, Math.max(35, Math.round((Math.abs(baseScore) + (newsStats?.hits ?? 0)) * 12)));

        const rationaleParts = [
          `RR ${coin.rr.toFixed(1)} dengan TP ${formatPrice(coin.tp)} dan SL ${formatPrice(coin.sl)}`,
        ];

        if (newsStats) {
          rationaleParts.push(
            `${newsStats.hits} kabar sentimen ${newsStats.score >= 0 ? 'positif' : 'negatif'} (bobot ${newsStats.impact.toFixed(
              1
            )})`
          );
        }

        if (coin.pumpStatus === 'mau_pump') {
          rationaleParts.push('status mau pump menambah momentum');
        }

        const suggestedAction =
          direction === 'bullish'
            ? 'Entry bertahap, TP bertingkat, jaga SL ketat.'
            : direction === 'bearish'
              ? 'Hindari entry baru, fokus proteksi atau cari relief rally untuk exit.'
              : 'Pantau dulu, tunggu konfirmasi volume atau retest area entry.';

        predictionsMap.set(asset, {
          asset,
          direction,
          confidence,
          rationale: rationaleParts.join(' • '),
          suggestedAction,
          horizon: '1 minggu',
        });
      });

      newsScore.forEach((stats, asset) => {
        if (predictionsMap.has(asset)) return;

        const direction: PredictionDirection =
          stats.score >= 1.2 ? 'bullish' : stats.score <= -0.6 ? 'bearish' : 'netral';
        const confidence = Math.min(90, Math.max(30, Math.round((Math.abs(stats.score) + stats.hits) * 10)));

        predictionsMap.set(asset, {
          asset,
          direction,
          confidence,
          rationale: `${stats.hits} kabar terkait dengan skor sentimen ${(stats.score / stats.hits).toFixed(2)} dan bobot ${stats.impact.toFixed(
            1
          )}`,
          suggestedAction:
            direction === 'bullish'
              ? 'Pantau peluang breakout, siapkan entry skala kecil dengan SL dekat.'
              : direction === 'bearish'
                ? 'Waspada volatilitas, hindari entry agresif.'
                : 'Netral, tunggu katalis baru atau data teknikal tambahan.',
          horizon: '1 minggu',
        });
      });

      return Array.from(predictionsMap.values())
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 12);
    },
    [formatPrice, normalizeAssetFromPair]
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
      const coinMap = new Map(incomingCoins.map((c) => [c.pair, c]));
      setCoins(incomingCoins);

      const pumpCandidates = incomingCoins.filter((c) => c.pumpStatus === 'mau_pump');

      const now = Date.now();
      pumpCandidates.forEach((coin) => trackedPairsRef.current.set(coin.pair, now));

      const trackingRetentionMs = 2 * 60 * 60 * 1000;
      trackedPairsRef.current.forEach((startTime, pair) => {
        const expired = now - startTime > trackingRetentionMs;
        const coinStillExists = coinMap.has(pair);
        if (!coinStillExists || expired) {
          trackedPairsRef.current.delete(pair);
          lastWarningStateRef.current.delete(pair);
        }
      });

      const radarCoins: CoinSignal[] = [];
      trackedPairsRef.current.forEach((_, pair) => {
        const coin = coinMap.get(pair);
        if (coin) {
          radarCoins.push(coin);
        }
      });

      setWarnings((prev) => {
        const retentionMs = 2 * 60 * 60 * 1000;
        const stillFresh = prev.filter((item) => now - item.time < retentionMs);
        const updates: PumpWarning[] = [];

        radarCoins.forEach((coin) => {
          const guidance = buildWarningGuidance(coin);
          const lastKey = lastWarningStateRef.current.get(coin.pair);

          if (lastKey !== guidance.key) {
            updates.push({
              pair: coin.pair,
              moveFromLowPct: coin.moveFromLowPct,
              volIdr: coin.volIdr,
              last: coin.last,
              entry: coin.entry,
              tp: coin.tp,
              sl: coin.sl,
              rr: coin.rr,
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

  const fetchNews = useCallback(async () => {
    try {
      setNewsError(null);
      const res = await fetch('/api/news');
      if (!res.ok) {
        throw new Error(`Gagal mengambil berita (${res.status})`);
      }
      const data: NewsResponse = await res.json();
      setNews(data.news || []);
    } catch (err: unknown) {
      console.error(err);
      setNewsError(err instanceof Error ? err.message : 'Gagal mengambil berita');
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchNews();
    const interval = setInterval(() => {
      fetchData();
      setNowTs(Date.now());
    }, 15_000);

    const newsInterval = setInterval(() => {
      fetchNews();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(newsInterval);
    };
  }, [fetchData, fetchNews]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const retentionMs = 30 * 60 * 1000;
      setWarnings((prev) => prev.filter((item) => now - item.time < retentionMs));
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), 5_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPredictions(buildWeeklyPredictions(coins, news));
  }, [buildWeeklyPredictions, coins, news]);

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

  const predictionMap = useMemo(() => {
    const map = new Map<string, Prediction>();
    predictions.forEach((p) => map.set(p.asset.toUpperCase(), p));
    return map;
  }, [predictions]);

  const topPicks: TopPick[] = useMemo(() => {
    if (!coins.length) return [];

    const candidates: TopPick[] = coins
      .filter((coin) => coin.pumpStatus === 'mau_pump' || coin.rr >= 1.4)
      .map((coin) => {
        const asset = normalizeAssetFromPair(coin.pair);
        const pred = predictionMap.get(asset);

        const directionScore = pred
          ? pred.direction === 'bullish'
            ? 25
            : pred.direction === 'netral'
              ? 8
              : -50
          : 0;

        const momentumScore = Math.min(20, coin.moveFromLowPct / 2);
        const rrScore = Math.max(0, Math.min(25, (coin.rr - 1) * 10));
        const pumpScore = coin.pumpStatus === 'mau_pump' ? 20 : 0;
        const baseConfidence = pred?.confidence ?? 45;
        const score = baseConfidence + directionScore + momentumScore + rrScore + pumpScore;

        return {
          pair: coin.pair,
          asset,
          score,
          entry: coin.entry,
          tp: coin.tp,
          sl: coin.sl,
          rr: coin.rr,
          last: coin.last,
          direction: pred?.direction ?? 'bullish',
          confidence: pred?.confidence ?? 50,
          rationale:
            pred?.rationale ||
            `RR ${coin.rr.toFixed(1)} dan momentum ${coin.moveFromLowPct.toFixed(1)}% dari low 24j.`,
          suggestedAction:
            pred?.suggestedAction ||
            'Entry bertahap, hold sampai TP bertingkat. Jangan lupa disiplin SL.',
          horizon: pred?.horizon ?? 'Sampai TP (1-3 hari)',
        };
      })
      .filter((item) => item.score > 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return candidates;
  }, [coins, normalizeAssetFromPair, predictionMap]);

  const pumpList = coins.filter((c) => c.pumpStatus === 'mau_pump');

  const topPickInsight = useMemo(() => {
    if (topPicks.length === 0) {
      return {
        summary: 'Belum ada kandidat akurat untuk buy & hold.',
        action: 'Tahan entry besar, siapkan dana dan tunggu skor tertinggi berikutnya.',
      };
    }

    const leader = topPicks[0];
    return {
      summary: `${leader.asset} skor ${Math.round(leader.score)} (${leader.direction}), target ${formatPrice(
        leader.tp
      )}.`,
      action: `Fokus beli ${leader.asset} di ${formatPrice(leader.entry)}, tahan sampai TP ${formatPrice(
        leader.tp
      )}; disiplin SL ${formatPrice(leader.sl)}.`,
    };
  }, [formatPrice, topPicks]);

  const radarInsight = useMemo(() => {
    if (warnings.length === 0) {
      return {
        summary: 'Belum ada peringatan aktif, radar standby.',
        action: 'Pantau trigger baru sebelum eksekusi entry.',
      };
    }

    const latest = warnings[warnings.length - 1];
    return {
      summary: `${warnings.length} koin diawasi; terbaru ${latest.pair.toUpperCase()} (${latest.label}).`,
      action: `${latest.label}: ${latest.note}`,
    };
  }, [warnings]);

  const newsInsight = useMemo(() => {
    if (news.length === 0) {
      return {
        summary: 'Belum ada berita yang mencolok.',
        action: 'Tunggu kabar kuat untuk cari harga rendah.',
      };
    }

    const sentimentCount = news.reduce(
      (acc, item) => {
        acc[item.sentiment] += 1;
        item.assets.forEach((asset) => {
          const key = asset.toUpperCase();
          acc.assets.set(key, (acc.assets.get(key) ?? 0) + 1);
        });
        return acc;
      },
      { bullish: 0, bearish: 0, neutral: 0, assets: new Map<string, number>() }
    );

    const topAsset = Array.from(sentimentCount.assets.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

    const summaryParts = [
      `${sentimentCount.bullish} bullish`,
      `${sentimentCount.bearish} bearish`,
      `${sentimentCount.neutral} netral`,
    ];

    const dominant =
      sentimentCount.bullish > sentimentCount.bearish
        ? 'bullish'
        : sentimentCount.bearish > sentimentCount.bullish
          ? 'bearish'
          : 'netral';

    const summary = `Sentimen ${summaryParts.join(' / ')}; ${
      topAsset ? `${topAsset} paling sering disebut.` : 'pantau aset terkait.'
    }`;
    const action =
      dominant === 'bullish'
        ? `Cari diskon untuk masuk ${topAsset ?? 'aset yang ramai disebut'}; siap TP bertahap.`
        : dominant === 'bearish'
          ? `Hindari entry agresif di ${topAsset ?? 'aset rentan'}, fokus proteksi posisi.`
          : 'Tunggu katalis baru; hanya masuk pada aset dengan trigger jelas.';

    return { summary, action };
  }, [news]);

  const predictionInsight = useMemo(() => {
    if (predictions.length === 0) {
      return {
        summary: 'Prediksi mingguan belum tersedia.',
        action: 'Tunggu aset dengan confidence tinggi sebelum entry swing.',
      };
    }

    const strongest = [...predictions].sort((a, b) => b.confidence - a.confidence)[0];
    return {
      summary: `${strongest.asset} confidence ${strongest.confidence}% (${strongest.direction}).`,
      action: `Ikuti: ${strongest.suggestedAction}`,
    };
  }, [predictions]);

  const pumpInsight = useMemo(() => {
    if (pumpList.length === 0) {
      return {
        summary: 'Belum ada kandidat mau pump aktif.',
        action: 'Tunggu sinyal hijau berikutnya sebelum entry.',
      };
    }

    const focus = selected ?? pumpList[0];
    return {
      summary: `${pumpList.length} koin mau pump; fokus ${focus.pair.toUpperCase()}.`,
      action: `Langsung cek ${focus.pair.toUpperCase()}, entry ${formatPrice(
        focus.entry
      )}, target TP ${formatPrice(focus.tp)}, SL ${formatPrice(focus.sl)}.`,
    };
  }, [formatPrice, pumpList, selected]);

  const usdtIdrRate = useMemo(() => {
    const usdtPair = coins.find((c) => {
      const pair = c.pair.toLowerCase();
      return pair === 'usdt_idr' || pair === 'usdtidr' || pair.includes('usdt_idr');
    });
    return usdtPair?.last ?? null;
  }, [coins]);

  const btcMarketSummary = useMemo(() => {
    const btcUsdt =
      coins.find((c) => {
        const pair = c.pair.toLowerCase();
        return pair.includes('btc_usdt') || pair.includes('btc-usdt') || pair.includes('btc_usd');
      }) ?? null;
    const btcIdr =
      coins.find((c) => {
        const pair = c.pair.toLowerCase();
        return pair.includes('btc_idr') || pair.includes('btc-idr');
      }) ?? coins.find((c) => c.pair.toLowerCase().startsWith('btc'));

    const btc = btcUsdt ?? btcIdr ?? null;
    const btcPrediction = predictions.find((p) => p.asset.toUpperCase() === 'BTC');

    const bias = btcPrediction?.direction ?? (btc?.pricePhase === 'baru_mau_naik' ? 'bullish' : 'bearish');
    const horizon = btcPrediction?.horizon ?? '1-3 hari';
    const horizonWindow = describeHorizonWindow(horizon);

    const toUsd = (value: number | null | undefined) => {
      if (!Number.isFinite(value ?? NaN)) return null;
      if (btcUsdt) return value ?? null;
      if (!usdtIdrRate || usdtIdrRate <= 0) return null;
      return (value ?? 0) / usdtIdrRate;
    };

    const supportRaw = btc ? Math.min(btc.sl, btc.entry * 0.98, btc.low) : null;
    const resistanceRaw = btc ? Math.max(btc.tp, btc.high, btc.entry * 1.03) : null;
    const lastRaw = btc?.last ?? null;

    const support = toUsd(supportRaw);
    const resistance = toUsd(resistanceRaw);
    const last = toUsd(lastRaw);

    let line = 'Belum ada data BTC terkini.';
    let caution = 'Tunggu data harga untuk menentukan level kunci.';
    let action = 'Pantau BTC lebih dulu sebelum eksekusi aset lain.';

    if (support && resistance && last) {
      const supportLabel = formatUsd(support);
      const resistanceLabel = formatUsd(resistance);
      const biasLabel = bias === 'bullish' ? 'Bull' : bias === 'bearish' ? 'Bear' : 'Netral';

      line = `${biasLabel} ${horizon} (${horizonWindow.untilLabel}); support ${supportLabel}, resist ${resistanceLabel}.`;

      const nearSupport = last <= support * 1.01;
      const nearResistance = last >= resistance * 0.99;
      const breakout = last > resistance * 1.01;
      const breakdown = last < support * 0.99;

      if (breakout) {
        caution = `Harga sudah melewati resist ${resistanceLabel}, peluang lanjut ${bias === 'bearish' ? 'netral/bull' : 'bull'} selama volume kuat.`;
      } else if (breakdown) {
        caution = `Turun di bawah support ${supportLabel}; hati-hati kelanjutan bear hingga ada reclaim.`;
      } else if (nearResistance) {
        caution = `Mepet resist ${resistanceLabel}; hindari entry FOMO, siapkan take profit defensif.`;
      } else if (nearSupport) {
        caution = `Menempel support ${supportLabel}; waspadai pantulan lemah atau potensi tembus.`;
      } else {
        caution = `Masih di range ${supportLabel} - ${resistanceLabel}; tunggu tembus area sebelum agresif.`;
      }

      action =
        bias === 'bullish'
          ? `Fokus buy the dip dekat ${supportLabel} dan tahan sampai konfirmasi tembus ${resistanceLabel}.`
          : bias === 'bearish'
            ? `Prioritaskan proteksi; kalau gagal reclaim ${supportLabel}, siapkan CL cepat dan hindari entry baru.`
            : `Netral; tunggu arah jelas di atas ${resistanceLabel} untuk bull atau di bawah ${supportLabel} untuk bear.`;
    }

    return { line, caution, action };
  }, [coins, describeHorizonWindow, formatUsd, predictions, usdtIdrRate]);

  const bestTodaySummary = useMemo(() => {
    if (topPicks.length === 0) {
      return {
        headline: 'Belum ada koin paling akurat untuk dieksekusi hari ini.',
        action: 'Tunggu rekomendasi baru dengan skor tinggi sebelum masuk.',
      };
    }

    const leader = topPicks[0];
    const horizonWindow = describeHorizonWindow(leader.horizon);
    const dirLabel = leader.direction === 'bullish' ? 'Bull' : leader.direction === 'bearish' ? 'Bear' : 'Netral';

    return {
      headline: `${leader.asset} ${dirLabel} ${leader.confidence}% (${leader.horizon}, ${horizonWindow.untilLabel}). Entry ${formatPrice(
        leader.entry
      )}, TP ${formatPrice(leader.tp)}, SL ${formatPrice(leader.sl)}.`,
      action: `Eksekusi ${leader.asset} hari ini, tahan sampai ${horizonWindow.untilLabel} atau TP ${formatPrice(
        leader.tp
      )}; hindari kejar harga di atas ${formatPrice(leader.entry * 1.04)}.`,
    };
  }, [describeHorizonWindow, formatPrice, topPicks]);

  const bestPumpTodaySummary = useMemo(() => {
    const pumpPickCandidates = topPicks.filter((pick) => pumpList.some((p) => p.pair === pick.pair));
    const fallbackFromPumpList = pumpList.map((coin) => ({
      pair: coin.pair,
      asset: normalizeAssetFromPair(coin.pair),
      entry: coin.entry,
      tp: coin.tp,
      sl: coin.sl,
      direction: coin.pricePhase === 'baru_mau_naik' ? 'bullish' : 'netral',
      horizon: '1-3 hari',
    }));

    const picks = (pumpPickCandidates.length ? pumpPickCandidates : fallbackFromPumpList).slice(0, 2);

    if (picks.length === 0) {
      return {
        headline: 'Belum ada top pick pump untuk dieksekusi hari ini.',
        items: [],
        action: 'Pantau radar sampai ada koin pump yang siap dieksekusi.',
      };
    }

    const items = picks.map((pick) => {
      const horizonWindow = describeHorizonWindow(pick.horizon ?? '1-3 hari');
      const dirLabel = pick.direction === 'bearish' ? 'Bear' : 'Bull';
      return `${pick.asset} ${dirLabel} sampai ${horizonWindow.untilLabel}: entry ${formatPrice(pick.entry)}, TP ${formatPrice(
        pick.tp
      )}, SL ${formatPrice(pick.sl)}.`;
    });

    return {
      headline: `${picks.length} top pick pump hari ini siap dieksekusi.`,
      items,
      action: 'Prioritaskan dua koin pump ini lebih dulu sebelum masuk pasangan lain.',
    };
  }, [describeHorizonWindow, formatPrice, normalizeAssetFromPair, pumpList, topPicks]);

  const pumpChartPicks = useMemo(
    () => {
      const picks = pumpList.slice(0, 2);
      return picks.map((coin) => {
        const posPct = Math.max(0, Math.min(100, coin.posInRange * 100));
        const momentum = coin.moveFromLowPct.toFixed(1);
        const rrNote = coin.rr >= 2 ? 'RR bagus' : coin.rr >= 1.6 ? 'RR cukup' : 'RR terbatas';
        const zone =
          posPct >= 75 ? 'dekat high harian (awas overheat)' : posPct <= 40 ? 'masih dekat low (siap akumulasi)' : 'zona tengah';

        return {
          coin,
          brief: `${coin.pair.toUpperCase()} ${momentum}% dari low 24j, ${rrNote}, posisi ${posPct.toFixed(1)}% (${zone}).`,
          action: `Entry ${formatPrice(coin.entry)} · TP ${formatPrice(coin.tp)} · SL ${formatPrice(coin.sl)}.`,
        };
      });
    },
    [formatPrice, pumpList]
  );

  const menuSections = useMemo(
    () => [
      {
        id: 'priority',
        title: 'Prioritas Buy & Hold',
        summary: topPickInsight.summary,
        action: topPickInsight.action,
      },
      {
        id: 'radar',
        title: 'Radar Peringatan Pump',
        summary: radarInsight.summary,
        action: radarInsight.action,
      },
      {
        id: 'news',
        title: 'Berita & Sentimen',
        summary: newsInsight.summary,
        action: newsInsight.action,
      },
      {
        id: 'predictions',
        title: 'Prediksi 1 Minggu',
        summary: predictionInsight.summary,
        action: predictionInsight.action,
      },
      {
        id: 'pump-list',
        title: 'Daftar Mau Pump',
        summary: pumpInsight.summary,
        action: pumpInsight.action,
      },
      {
        id: 'table',
        title: 'Tabel Detail',
        summary: pumpInsight.summary,
        action: pumpInsight.action,
      },
    ],
    [newsInsight, predictionInsight, pumpInsight, radarInsight, topPickInsight]
  );

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>SINTA Crypto Detector</h1>
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

      <section className="market-brief section-card accent-market">
        <div className="market-brief-head">
          <div className="market-brief-label">Ringkasan BTC/USD</div>
          <div className="market-brief-pill">Kesimpulan gabungan</div>
        </div>
        <div className="market-brief-body">
          <div className="market-brief-main">{btcMarketSummary.line}</div>
          <div className="market-brief-hint">{btcMarketSummary.caution}</div>
          <div className="market-brief-action">{btcMarketSummary.action}</div>
          <div className="market-brief-divider" />
          <div className="market-brief-subhead">Top pick eksekusi hari ini</div>
          <div className="market-brief-main">{bestTodaySummary.headline}</div>
          <div className="market-brief-action">{bestTodaySummary.action}</div>
          <div className="market-brief-divider" />
          <div className="market-brief-subhead">Top pick pump hari ini</div>
          <div className="market-brief-main">{bestPumpTodaySummary.headline}</div>
          {bestPumpTodaySummary.items.length > 0 && (
            <ul className="market-brief-list">
              {bestPumpTodaySummary.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <div className="market-brief-action">{bestPumpTodaySummary.action}</div>
        </div>
      </section>

      {error && <div className="error-box">Error: {error}</div>}

      <div className="layout-shell">
        <div className="layout-with-sidebar">
          <aside className="sidebar-menu">
            <h3>Menu Navigasi</h3>
            <ul>
              {menuSections.map((section) => (
                <li key={section.id} className={`sidebar-menu-item accent-${section.id}`}>
                  <a href={`#${section.id}`} className="sidebar-menu-link">
                    <div className="sidebar-menu-title-row">
                      <div className="sidebar-menu-title">{section.title}</div>
                      <span className="sidebar-chip">Aksi cepat</span>
                    </div>
                    <div className="sidebar-meta">
                      <span className="sidebar-label">Kesimpulan</span>
                      <div className="sidebar-menu-summary">{section.summary}</div>
                    </div>
                    <div className="sidebar-meta">
                      <span className="sidebar-label accent">Saran</span>
                      <div className="sidebar-menu-action">{section.action}</div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <div className="content-with-sidebar">
            <section id="priority" className="priority-section section-card accent-priority">
            <div className="priority-header">
              <div>
                <h2>Prioritas Buy & Hold sampai TP</h2>
                <p className="muted">
                  Menggabungkan sinyal mau pump + prediksi mingguan + RR untuk menyorot koin paling akurat dipegang hingga TP.
                </p>
              </div>
              <span className="badge badge-strong">Live terhubung prediksi & sinyal</span>
            </div>

            {topPicks.length === 0 ? (
              <div className="empty-state small">Menunggu sinyal & prediksi menyatu. Segera muncul begitu data siap.</div>
            ) : (
              <div className="priority-grid">
                {topPicks.map((pick) => (
                  <div key={pick.pair} className="priority-card">
                    <div className="priority-card-head">
                      <div>
                        <div className="priority-asset">{pick.asset}</div>
                        <div className="priority-pair">{pick.pair.toUpperCase()}</div>
                      </div>
                      <div className="priority-badges">
                        <span className="badge badge-pump">{pick.direction.toUpperCase()}</span>
                        <span className="badge badge-buy">Conf {pick.confidence}%</span>
                        <span className="badge badge-strong">Score {Math.round(pick.score)}</span>
                      </div>
                    </div>

                    <div className="priority-stats">
                      <div>
                        <div className="stat-label">Entry</div>
                        <div className="stat-value">{formatPrice(pick.entry)}</div>
                      </div>
                      <div>
                        <div className="stat-label">Last</div>
                        <div className="stat-value">{formatPrice(pick.last)}</div>
                      </div>
                      <div>
                        <div className="stat-label">TP</div>
                        <div className="stat-value">{formatPrice(pick.tp)}</div>
                      </div>
                      <div>
                        <div className="stat-label">SL</div>
                        <div className="stat-value">{formatPrice(pick.sl)}</div>
                      </div>
                      <div>
                        <div className="stat-label">RR</div>
                        <div className="stat-value">{pick.rr.toFixed(1)}</div>
                      </div>
                    </div>

                    <div className="priority-body">{pick.rationale}</div>
                    <div className="priority-action">{pick.suggestedAction}</div>
                    <div className="priority-footer">Horizon: {pick.horizon}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="radar" className="side-section section-card accent-radar">
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
                      {formatRelativeTime(warn.time)} • Naik dari low 24j ~{warn.moveFromLowPct.toFixed(1)}% • Volume {formatter.format(warn.volIdr)} IDR
                    </div>
                    <div className="side-list-sub muted">
                      Harga {formatPrice(warn.last)} | Entry {formatPrice(warn.entry)} | TP {formatPrice(warn.tp)} | SL {formatPrice(warn.sl)} | RR {warn.rr.toFixed(1)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="news" className="side-section section-card accent-news">
            <h3>Berita & Sentimen Terbaru</h3>
            {newsError && <div className="error-box">{newsError}</div>}
            {news.length === 0 ? (
              <p className="muted">Belum ada berita yang bisa ditampilkan.</p>
            ) : (
              <ul className="side-list">
                {news.map((item) => (
                  <li key={item.id} className="side-list-item">
                    <div className="side-list-title">
                      <span>{item.title}</span>
                      <span
                        className={`badge ${
                          item.sentiment === 'bullish'
                            ? 'badge-pump'
                            : item.sentiment === 'bearish'
                              ? 'badge-danger'
                              : 'badge-neutral'
                        }`}
                      >
                        {item.sentiment.toUpperCase()}
                      </span>
                    </div>
                    <div className="side-list-sub">{item.summary}</div>
                    <div className="side-list-sub muted">
                      {item.source} • Dampak {item.impact} • Aset: {item.assets.join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="predictions" className="side-section section-card accent-predictions">
            <h3>Prediksi Crypto & Coin 1 Minggu Ke Depan</h3>
            {predictions.length === 0 ? (
              <p className="muted">Prediksi mingguan muncul setelah data koin dan berita termuat.</p>
            ) : (
              <ul className="side-list">
                {predictions.map((pred) => (
                  <li key={pred.asset} className="side-list-item">
                    <div className="side-list-title">
                      <span>{pred.asset}</span>
                      <span
                        className={`badge ${
                          pred.direction === 'bullish'
                            ? 'badge-pump'
                            : pred.direction === 'bearish'
                              ? 'badge-danger'
                              : 'badge-neutral'
                        }`}
                      >
                        {pred.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="side-list-sub">Kepercayaan {pred.confidence}% • Horison {pred.horizon}</div>
                    <div className="side-list-sub">{pred.rationale}</div>
                    <div className="side-list-sub muted">Saran: {pred.suggestedAction}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="pump-list" className="side-section section-card accent-pump">
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

          <section id="details" className="top-layout">
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

          <section id="table" className="table-section section-card accent-detail">
            <h2>Daftar koin mau pump</h2>
            <CoinTable
              coins={pumpList}
              selectedPair={selected?.pair ?? null}
              onSelectCoin={setSelected}
            />
          </section>

          <section id="pump-charts" className="section-card accent-chart pump-chart-section">
            <div className="pump-chart-head">
              <div>
                <h3>Grafik dua koin pump teratas</h3>
                <p className="muted">Ringkasan cepat dan visual posisi harga untuk dua kandidat pump paling update.</p>
              </div>
              <span className="badge badge-pump">Live</span>
            </div>

            {pumpChartPicks.length === 0 ? (
              <div className="empty-state small">Belum ada koin pump untuk dianalisis grafiknya.</div>
            ) : (
              <div className="pump-chart-grid">
                {pumpChartPicks.map((item) => (
                  <div key={item.coin.pair} className="pump-chart-card">
                    <div className="chart-brief">
                      <div className="chart-brief-title">{item.coin.pair.toUpperCase()}</div>
                      <div className="chart-brief-line">{item.brief}</div>
                      <div className="chart-brief-sub">{item.action}</div>
                    </div>
                    <PairChart coin={item.coin} />
                  </div>
                ))}
              </div>
            )}
          </section>
          </div>
        </div>
      </div>
    </main>
  );
}
