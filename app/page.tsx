'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CoinTable from '../components/CoinTable';
import PairChart from '../components/PairChart';
import IndodaxChart from '../components/IndodaxChart';
import type { CoinSignal } from '../lib/sintaLogic';

interface ApiResponse {
  coins: CoinSignal[];
}

type PredictionDirection = 'bullish' | 'bearish' | 'neutral';

const PIN_STORAGE_KEY = 'sinta-pin-authorized';

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
  const [isAuthorized, setIsAuthorized] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(PIN_STORAGE_KEY) === 'true'
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const lastWarningStateRef = useRef<Map<string, string>>(new Map());
  const trackedPairsRef = useRef<Map<string, number>>(new Map());

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
      }),
    []
  );

  const formatPrice = useCallback((value: number) => formatter.format(value), [formatter]);
  const formatRupiah = useCallback((value: number) => `Rp ${formatPrice(value)}`, [formatPrice]);

  const lastUpdatedLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(nowTs),
    [nowTs]
  );

  const describeHorizonWindow = useCallback(
    (horizon: string) => {
      const matches = [...horizon.matchAll(/(\d+)\s*(day|days|week|weeks)/gi)];

      let maxDays = 3;
      matches.forEach(([, num, unit]) => {
        const days = Number.parseInt(num, 10) * (unit.toLowerCase().startsWith('week') ? 7 : 1);
        if (!Number.isNaN(days) && days > maxDays) {
          maxDays = days;
        }
      });

      const until = new Date(nowTs + maxDays * 24 * 60 * 60 * 1000);
      const untilLabel = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
      }).format(until);

      return { maxDays, untilLabel: `until ${untilLabel}` };
    },
    [nowTs]
  );

  const formatRelativeTime = useCallback(
    (time: number) => {
      const diff = nowTs - time;
      if (diff < 0) return 'just now';

      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) return `${seconds}s ago`;

      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;

      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;

      const days = Math.floor(hours / 24);
      return `${days}d ago`;
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
          note: `Price is near or falling toward SL ${formatPrice(sl)}. Cut losses early if it does not hold to avoid deeper drawdowns.`,
        };
      }

      if (hitTp) {
        return {
          key: 'tp_full',
          label: 'Full TP',
          note: `TP ${formatPrice(tp)} has been hit. Secure profits and avoid new entries until a fresh setup appears.`,
        };
      }

      if (nearTp) {
        return {
          key: 'tp_partial',
          label: 'Partial TP',
          note: `Price is nearing TP ${formatPrice(tp)}. Realize partial profits and let the rest run if volume stays strong.`,
        };
      }

      if (aboveEntry) {
        return {
          key: 'no_entry',
          label: 'Hold New Entries',
          note: `Momentum already moved above entry ${formatPrice(entry)}. Do not chase; manage the position and keep TP at ${formatPrice(tp)}.`,
        };
      }

      if (nearEntry) {
        return {
          key: 'entry_zone',
          label: 'Entry Zone',
          note: `Price is still around entry ${formatPrice(entry)}. Scale in slowly but stay disciplined with SL ${formatPrice(sl)} and TP ${formatPrice(tp)}.`,
        };
      }

      return {
        key: 'wait',
        label: 'Wait for Momentum',
        note: `Has not reached the entry area ${formatPrice(entry)}. Wait for confirmation before entering and aim for TP at ${formatPrice(tp)}.`,
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
          baseScore >= 1.5 ? 'bullish' : baseScore <= -0.6 ? 'bearish' : 'neutral';

        const confidence = Math.min(100, Math.max(35, Math.round((Math.abs(baseScore) + (newsStats?.hits ?? 0)) * 12)));

        const rationaleParts = [
          `RR ${coin.rr.toFixed(1)} with TP ${formatPrice(coin.tp)} and SL ${formatPrice(coin.sl)}`,
        ];

        if (newsStats) {
          rationaleParts.push(
            `${newsStats.hits} sentiment updates leaning ${newsStats.score >= 0 ? 'positive' : 'negative'} (weight ${newsStats.impact.toFixed(
              1
            )})`
          );
        }

        if (coin.pumpStatus === 'mau_pump') {
          rationaleParts.push('About-to-pump status adds momentum');
        }

        const suggestedAction =
          direction === 'bullish'
            ? 'Enter gradually, scale TPs, and keep a tight SL.'
            : direction === 'bearish'
              ? 'Avoid new entries; focus on protection or use relief rallies to exit.'
              : 'Watch first and wait for volume confirmation or an entry-area retest.';

        predictionsMap.set(asset, {
          asset,
          direction,
          confidence,
          rationale: rationaleParts.join(' • '),
          suggestedAction,
          horizon: '1 week',
        });
      });

      newsScore.forEach((stats, asset) => {
        if (predictionsMap.has(asset)) return;

        const direction: PredictionDirection =
          stats.score >= 1.2 ? 'bullish' : stats.score <= -0.6 ? 'bearish' : 'neutral';
        const confidence = Math.min(90, Math.max(30, Math.round((Math.abs(stats.score) + stats.hits) * 10)));

        predictionsMap.set(asset, {
          asset,
          direction,
          confidence,
          rationale: `${stats.hits} related updates with sentiment score ${(stats.score / stats.hits).toFixed(2)} and weight ${stats.impact.toFixed(
            1
          )}`,
          suggestedAction:
            direction === 'bullish'
              ? 'Monitor breakout potential; prep small entries with a tight SL.'
              : direction === 'bearish'
                ? 'Beware volatility; avoid aggressive entries.'
                : 'Neutral—wait for new catalysts or more technical data.',
          horizon: '1 week',
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
        throw new Error(`Failed to fetch data (${res.status})`);
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
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [buildWarningGuidance]);

  const fetchNews = useCallback(async () => {
    try {
      setNewsError(null);
      const res = await fetch('/api/news');
      if (!res.ok) {
        throw new Error(`Failed to fetch news (${res.status})`);
      }
      const data: NewsResponse = await res.json();
      setNews(data.news || []);
    } catch (err: unknown) {
      console.error(err);
      setNewsError(err instanceof Error ? err.message : 'Failed to fetch news');
    }
  }, []);

  const handlePinSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (pinInput.trim() === '111111') {
        setIsAuthorized(true);
        localStorage.setItem(PIN_STORAGE_KEY, 'true');
        setPinError(null);
      } else {
        setPinError('Incorrect PIN, please try again.');
      }
    },
    [pinInput]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      if (stored === 'true') {
        setIsAuthorized(true);
      }
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return undefined;

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
  }, [fetchData, fetchNews, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return undefined;

    const interval = setInterval(() => {
      const now = Date.now();
      const retentionMs = 30 * 60 * 1000;
      setWarnings((prev) => prev.filter((item) => now - item.time < retentionMs));
    }, 60_000);

    return () => clearInterval(interval);
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return undefined;

    const interval = setInterval(() => setNowTs(Date.now()), 5_000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

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
            : pred.direction === 'neutral'
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
            `RR ${coin.rr.toFixed(1)} with momentum ${coin.moveFromLowPct.toFixed(1)}% from the 24h low.`,
          suggestedAction:
            pred?.suggestedAction ||
            'Enter gradually and hold through tiered TP targets. Stay disciplined with the SL.',
          horizon: pred?.horizon ?? 'Until TP (1-3 days)',
        };
      })
      .filter((item) => item.score > 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return candidates;
  }, [coins, normalizeAssetFromPair, predictionMap]);

  const pumpList = coins.filter((c) => c.pumpStatus === 'mau_pump');

  const btcContext = useMemo(() => {
    const btcIdr =
      coins.find((c) => {
        const pair = c.pair.toLowerCase();
        return pair.includes('btc_idr') || pair.includes('btc-idr');
      }) ?? coins.find((c) => c.pair.toLowerCase().startsWith('btc'));

    const usdtPair = coins.find((c) => {
      const pair = c.pair.toLowerCase();
      return pair === 'usdt_idr' || pair === 'usdtidr' || pair.includes('usdt_idr');
    });

    const btc = btcIdr ?? null;
    const btcPrediction = predictions.find((p) => p.asset.toUpperCase() === 'BTC');

    const bias = btcPrediction?.direction ?? (btc?.pricePhase === 'baru_mau_naik' ? 'bullish' : 'bearish');
    const horizon = btcPrediction?.horizon ?? '1-3 days';
    const horizonWindow = describeHorizonWindow(horizon);

    const toIdr = (value: number | null | undefined) => {
      if (!Number.isFinite(value ?? NaN)) return null;
      if (btcIdr) return value ?? null;
      if (!usdtPair?.last || usdtPair.last <= 0) return null;
      return (value ?? 0) * usdtPair.last;
    };

    const supportRaw = btc ? Math.min(btc.sl, btc.entry * 0.98, btc.low) : null;
    const resistanceRaw = btc ? Math.max(btc.tp, btc.high, btc.entry * 1.03) : null;
    const lastRaw = btc?.last ?? null;

    const support = toIdr(supportRaw);
    const resistance = toIdr(resistanceRaw);
    const last = toIdr(lastRaw);
    const coilPct = support && resistance ? ((resistance - support) / support) * 100 : null;

    return { btc, bias, horizon, horizonWindow, support, resistance, last, coilPct };
  }, [coins, describeHorizonWindow, predictions]);

  const pumpMathList = useMemo(() => {
    if (!pumpList.length) return [];

    return pumpList
      .map((coin) => {
        const upsidePct = Number.isFinite(coin.last) && coin.last > 0 ? ((coin.tp - coin.last) / coin.last) * 100 : 0;
        const downsidePct = Number.isFinite(coin.last) && coin.last > 0 ? ((coin.last - coin.sl) / coin.last) * 100 : 0;
        const rrLive = downsidePct > 0 ? upsidePct / downsidePct : coin.rr;
        const entryGapPct = Number.isFinite(coin.last) && coin.last > 0 ? ((coin.entry - coin.last) / coin.last) * 100 : 0;
        const heatPct = Math.max(0, Math.min(100, coin.posInRange * 100));
        const momentumPct = Math.max(0, coin.moveFromLowPct);
        const volumeScore = Math.max(18, Math.min(40, Math.log10(Math.max(coin.volIdr, 1)) * 12 - 36));
        const rrScore = Math.min(28, Math.max(0, rrLive * 9));
        const setupScore = Math.min(18, Math.max(0, 18 - Math.abs(heatPct - 58) * 0.25));
        const momentumScore = Math.min(24, Math.max(0, momentumPct * 0.7));
        const score = Math.round(volumeScore + rrScore + setupScore + momentumScore);

        const coilPct = Math.max(0, Math.min(25, ((coin.high - coin.low) / Math.max(coin.low, 1)) * 100));
        const sidewayLabel = coilPct <= 6 ? 'Tight range' : coilPct <= 12 ? 'Wide sideway' : 'Broad range';
        const sidewayNote =
          coilPct <= 6
            ? 'Ranging tightly for a while; ready to pop if volume steps in'
            : coilPct <= 12
              ? 'Sideways for a while; needs a clear trigger'
              : 'Wide range; momentum often whipsaws';

        const priorSpike = Math.max(momentumPct - 5, 0);
        const historyNote = priorSpike >= 18
          ? `Previously climbed ${priorSpike.toFixed(1)}% after ranging`
          : `Small rise of ${priorSpike.toFixed(1)}%; room to continue is open`;

        const midLine = (coin.entry + coin.tp) / 2;
        const crossedMid = Number.isFinite(coin.last) && coin.last >= midLine;
        const structureNote = crossedMid
          ? 'Price has crossed the mid-line toward TP'
          : 'Has not crossed the mid-line yet; wait for a trigger';

        const btcDrag = btcContext.bias === 'bearish' ? 'BTC bias is down—reduce size' : 'Supported by BTC/upside bias';

        const liquidityLabel =
          coin.volIdr >= 5_000_000_000
            ? 'High liquidity'
            : coin.volIdr >= 2_000_000_000
              ? 'Decent liquidity'
              : 'Thin liquidity';

        const bufferNote =
          downsidePct >= 5
            ? 'SL buffer is comfortable'
            : downsidePct >= 3
              ? 'Buffer is middling'
              : 'Buffer is thin; prone to sharp drops';

        const entryNote =
          entryGapPct < -3
            ? 'Price has run far above entry, wait for a retrace'
            : entryGapPct < 1
              ? 'Already near or past entry'
              : 'Still below entry—can scale in';

        let bias: 'bull' | 'neutral' | 'risk' = 'bull';
        if (rrLive < 1.4 || upsidePct < 6) {
          bias = 'risk';
        } else if (score < 55) {
          bias = 'neutral';
        }

        const actionLine =
          bias === 'bull'
            ? `Chance for ${upsidePct.toFixed(1)}% upside to TP with live RR ${rrLive.toFixed(2)}; entry ${
                entryGapPct > 1 ? 'still discounted' : 'already moving'
              } by ${entryGapPct.toFixed(1)}%.`
            : bias === 'neutral'
            ? `Decent setup but needs extra volume confirmation. Upside ${upsidePct.toFixed(1)}%, RR ${rrLive.toFixed(2)}.`
            : `Risk > reward (${rrLive.toFixed(2)}). Safer to wait for a re-entry near ${formatPrice(coin.entry)}.`;

        const convictionLabel =
          score >= 90 ? 'A' : score >= 75 ? 'B+' : score >= 65 ? 'B' : score >= 55 ? 'C+' : 'C';
        const convictionNote =
          rrLive >= 2.4
            ? 'RR is very healthy—priority entry'
            : rrLive >= 1.6
              ? 'RR is solid—execute gradually'
              : 'RR is low—prioritize protection';

        const riskNote = `${bufferNote} • ${entryNote}`;
        const confidencePct = Math.min(99, Math.max(45, Math.round(score * 0.9 + (btcContext.bias === 'bullish' ? 4 : -6))));

        return {
          coin,
          upsidePct,
          downsidePct,
          rrLive,
          entryGapPct,
          heatPct,
          momentumPct,
          score,
          bias,
          actionLine,
          liquidityLabel,
          convictionLabel,
          convictionNote,
          riskNote,
          sidewayLabel,
          sidewayNote,
          structureNote,
          btcDrag,
          historyNote,
          confidencePct,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [btcContext.bias, formatPrice, pumpList]);

  const gradeACheapList = useMemo(() => {
    return pumpMathList
      .filter((item) => item.coin.last < 1_000 && item.convictionLabel === 'A')
      .map((item) => ({
        pair: item.coin.pair,
        last: item.coin.last,
        entry: item.coin.entry,
        tp: item.coin.tp,
        status: item.coin.pricePhase === 'sudah_telanjur_naik' ? 'Sudah telanjur pump' : 'Belum telanjur pump',
        isPumped: item.coin.pricePhase === 'sudah_telanjur_naik',
        rr: item.rrLive,
        momentum: item.momentumPct,
      }));
  }, [pumpMathList]);

  const topPickInsight = useMemo(() => {
    if (topPicks.length === 0) {
      return {
        summary: 'No strong buy-and-hold candidates yet.',
        action: 'Hold off on big entries, keep funds ready, and wait for the next top score.',
      };
    }

    const leader = topPicks[0];
    return {
      summary: `${leader.asset} score ${Math.round(leader.score)} (${leader.direction}), target ${formatPrice(
        leader.tp
      )}.`,
      action: `Focus on buying ${leader.asset} at ${formatPrice(leader.entry)}, hold until TP ${formatPrice(
        leader.tp
      )}; stay disciplined with SL ${formatPrice(leader.sl)}.`,
    };
  }, [formatPrice, topPicks]);

  const drawdownInsight = useMemo(() => {
    if (pumpList.length === 0) {
      return {
        summary: 'No active positions need rescue.',
        actions: ['Wait for the next about-to-pump signal before entering.'],
        items: [] as {
          pair: string;
          pnlPct: number;
          toTpPct: number;
          toSlPct: number;
          status: 'danger' | 'caution' | 'ok' | 'watch';
          headline: string;
          guidance: string;
        }[],
      };
    }

    const items = pumpList.map((coin) => {
      const pnlPct = Number.isFinite(coin.last)
        ? ((coin.last - coin.entry) / coin.entry) * 100
        : 0;
      const toTpPct = Number.isFinite(coin.last) && coin.last > 0
        ? ((coin.tp - coin.last) / coin.last) * 100
        : 0;
      const toSlPct = Number.isFinite(coin.last) && coin.last > 0
        ? ((coin.last - coin.sl) / coin.last) * 100
        : 0;

      let status: 'danger' | 'caution' | 'ok' | 'watch' = 'watch';
      let headline = '';
      let guidance = '';

      const baseLine = `${coin.pair.toUpperCase()} P/L ${pnlPct.toFixed(1)}% • TP ${formatPrice(
        coin.tp
      )} • SL ${formatPrice(coin.sl)}`;

      if (pnlPct < 0 && toSlPct <= 5) {
        status = 'danger';
        headline = `${baseLine} (near SL)`;
        guidance = `Lock the small loss quickly to avoid deeper bagholding. Move SL to ${formatPrice(
          coin.sl
        )} or scale out.`;
      } else if (pnlPct < 0) {
        status = 'caution';
        headline = `${baseLine} (negative)`;
        guidance = `Entry has not hit TP; scale out or wait for a retest near ${formatPrice(
          coin.entry
        )} and cut losses if it fails to break.`;
      } else if (toTpPct <= 6) {
        status = 'ok';
        headline = `${baseLine} (near TP)`;
        guidance = `Lock profit: realize a portion and slide SL to ${formatPrice(
          coin.entry
        )} to avoid flipping negative.`;
      } else {
        status = 'watch';
        headline = `${baseLine} (stable)`;
        guidance = `Hold while monitoring volume. Avoid adding entries if price is already ${formatPrice(
          coin.entry * 1.04
        )} or higher.`;
      }

      return { pair: coin.pair, pnlPct, toTpPct, toSlPct, status, headline, guidance };
    });

    const losers = items.filter((item) => item.pnlPct < 0);
    const nearSl = items.filter((item) => item.status === 'danger');
    const nearTp = items.filter((item) => item.status === 'ok');

    const summaryParts = [
      `${losers.length} positions negative`,
      `${nearSl.length} near SL`,
      `${nearTp.length} near TP`,
    ];

    const actions: string[] = [];
    if (nearSl.length > 0) {
      actions.push('Priority: secure positions that are close to SL; do not wait for deeper losses.');
    }
    if (losers.length > 0) {
      actions.push('Scale out of losing positions; only add entries after a confirmed break.');
    }
    if (nearTp.length > 0) {
      actions.push('Lock partial profit on positions already near TP.');
    }
    if (actions.length === 0) {
      actions.push('All positions are stable; keep monitoring volume and range.');
    }

    const priority: Record<typeof items[number]['status'], number> = {
      danger: 0,
      caution: 1,
      ok: 2,
      watch: 3,
    };

    return {
      summary: summaryParts.join(' • '),
      actions,
      items: items.sort((a, b) => {
        const byStatus = priority[a.status] - priority[b.status];
        if (byStatus !== 0) return byStatus;
        return Math.abs(b.pnlPct) - Math.abs(a.pnlPct);
      }),
    };
  }, [formatPrice, pumpList]);

  const radarInsight = useMemo(() => {
    if (warnings.length === 0) {
      return {
        summary: 'No active alerts—radar on standby.',
        action: 'Watch for a new trigger before executing entries.',
      };
    }

    const latest = warnings[warnings.length - 1];
    return {
      summary: `${warnings.length} coins under watch; latest ${latest.pair.toUpperCase()} (${latest.label}).`,
      action: `${latest.label}: ${latest.note}`,
    };
  }, [warnings]);

  const newsInsight = useMemo(() => {
    if (news.length === 0) {
      return {
        summary: 'No standout news yet.',
        action: 'Wait for strong headlines before buying dips.',
        biasLabel: 'Neutral',
        biasDetail: 'Not enough data to determine sentiment bias.',
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
      `${sentimentCount.neutral} neutral`,
    ];

    const weightedScore = news.reduce((acc, item) => {
      const weight = item.impact === 'high' ? 1.2 : item.impact === 'medium' ? 1 : 0.6;
      const sentiment = item.sentiment === 'bullish' ? 1 : item.sentiment === 'bearish' ? -1 : 0.2;
      return acc + sentiment * weight;
    }, 0);

    const dominant =
      weightedScore > 2
        ? 'bullish'
        : weightedScore < -2
          ? 'bearish'
          : sentimentCount.bullish > sentimentCount.bearish
            ? 'bullish'
            : sentimentCount.bearish > sentimentCount.bullish
              ? 'bearish'
              : 'neutral';

    const biasLabel = dominant === 'bullish' ? 'Bull' : dominant === 'bearish' ? 'Bear' : 'Neutral';
    const biasDetail = `Bias ${biasLabel} (score ${(weightedScore >= 0 ? '+' : '') + weightedScore.toFixed(1)}): ${summaryParts.join(
      ' / '
    )}${topAsset ? `; ${topAsset} mentioned most often.` : ''}`;

    const summary = `Sentiment ${summaryParts.join(' / ')}; ${
      topAsset ? `${topAsset} mentioned most often.` : 'watch related assets.'
    }`;
    const action =
      dominant === 'bullish'
        ? `Hunt for discounts to enter ${topAsset ?? 'the most-mentioned assets'}; be ready to take profit in stages.`
        : dominant === 'bearish'
          ? `Avoid aggressive entries on ${topAsset ?? 'vulnerable assets'}; focus on protecting positions.`
          : 'Wait for new catalysts; only enter assets with clear triggers.';

    return { summary, action, biasLabel, biasDetail };
  }, [news]);

  const predictionInsight = useMemo(() => {
    if (predictions.length === 0) {
      return {
        summary: 'Weekly predictions are not available yet.',
        action: 'Wait for assets with high confidence before entering swing trades.',
      };
    }

    const strongest = [...predictions].sort((a, b) => b.confidence - a.confidence)[0];
    return {
      summary: `${strongest.asset} confidence ${strongest.confidence}% (${strongest.direction}).`,
      action: `Follow: ${strongest.suggestedAction}`,
    };
  }, [predictions]);

  const pumpInsight = useMemo(() => {
    if (pumpList.length === 0) {
      return {
        summary: 'No active about-to-pump candidates.',
        action: 'Wait for the next green signal before entering.',
      };
    }

    const focus = selected ?? pumpList[0];
    return {
      summary: `${pumpList.length} coins about to pump; focus on ${focus.pair.toUpperCase()}.`,
      action: `Check ${focus.pair.toUpperCase()} now, entry ${formatPrice(
        focus.entry
      )}, target TP ${formatPrice(focus.tp)}, SL ${formatPrice(focus.sl)}.`,
    };
  }, [formatPrice, pumpList, selected]);

  const pumpMathInsight = useMemo(() => {
    if (pumpMathList.length === 0) {
      return {
        summary: 'No detailed calculations yet because no coins are about to pump.',
        action: 'Wait for an about-to-pump signal to view live RR and TP/SL distances.',
      };
    }

    const leader = pumpMathList[0];
    return {
      summary: `${leader.coin.pair.toUpperCase()} live RR ${leader.rrLive.toFixed(2)}; upside ${
        leader.upsidePct.toFixed(1)
      }% vs risk ${leader.downsidePct.toFixed(1)}%.`,
      action: leader.actionLine,
    };
  }, [pumpMathList]);

  const btcMarketSummary = useMemo(() => {
    const { bias, horizon, horizonWindow, support, resistance, last } = btcContext;

    let line = 'No fresh BTC data yet.';
    let caution = 'Wait for price data to define key levels.';
    let action = 'Watch BTC first before executing other assets.';

    if (support && resistance && last) {
      const supportLabel = formatRupiah(support);
      const resistanceLabel = formatRupiah(resistance);
      const biasLabel = bias === 'bullish' ? 'Bull' : bias === 'bearish' ? 'Bear' : 'Neutral';

      line = `${biasLabel} ${horizon} (${horizonWindow.untilLabel}); support ${supportLabel}, resistance ${resistanceLabel}.`;

      const nearSupport = last <= support * 1.01;
      const nearResistance = last >= resistance * 0.99;
      const breakout = last > resistance * 1.01;
      const breakdown = last < support * 0.99;

      if (breakout) {
        caution = `Price has broken past resistance ${resistanceLabel}; potential to continue ${bias === 'bearish' ? 'to neutral/bullish' : 'bullish'} while volume stays strong.`;
      } else if (breakdown) {
        caution = `Dropped below support ${supportLabel}; beware of continued bearish action until reclaimed.`;
      } else if (nearResistance) {
        caution = `Hovering near resistance ${resistanceLabel}; avoid FOMO entries and prepare defensive take-profit.`;
      } else if (nearSupport) {
        caution = `Sitting on support ${supportLabel}; watch for weak bounces or potential breaks.`;
      } else {
        caution = `Still ranging ${supportLabel} - ${resistanceLabel}; wait for a break before getting aggressive.`;
      }

      action =
        bias === 'bullish'
          ? `Focus on buy-the-dip near ${supportLabel} and hold until a confirmed break of ${resistanceLabel}.`
          : bias === 'bearish'
            ? `Prioritize protection; if ${supportLabel} cannot be reclaimed, be ready to cut quickly and avoid new entries.`
            : `Neutral; wait for clear direction above ${resistanceLabel} for bull or below ${supportLabel} for bear.`;
    }

    return { line, caution, action };
  }, [btcContext, formatRupiah]);

  const bestTodaySummary = useMemo(() => {
    if (topPicks.length === 0) {
      return {
        headline: 'No top-accuracy coin to execute today yet.',
        action: 'Wait for a new high-score recommendation before entering.',
      };
    }

    const leader = topPicks[0];
    const horizonWindow = describeHorizonWindow(leader.horizon);
    const dirLabel = leader.direction === 'bullish' ? 'Bull' : leader.direction === 'bearish' ? 'Bear' : 'Neutral';

    return {
      headline: `${leader.asset} ${dirLabel} ${leader.confidence}% (${leader.horizon}, ${horizonWindow.untilLabel}). Entry ${formatPrice(
        leader.entry
      )}, TP ${formatPrice(leader.tp)}, SL ${formatPrice(leader.sl)}.`,
      action: `Execute ${leader.asset} today, hold until ${horizonWindow.untilLabel} or TP ${formatPrice(
        leader.tp
      )}; avoid chasing above ${formatPrice(leader.entry * 1.04)}.`,
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
      direction: coin.pricePhase === 'baru_mau_naik' ? 'bullish' : 'neutral',
      horizon: '1-3 days',
    }));

    const picks = (pumpPickCandidates.length ? pumpPickCandidates : fallbackFromPumpList).slice(0, 2);

    if (picks.length === 0) {
      return {
        headline: 'No top pump pick to execute today.',
        items: [],
        action: 'Watch the radar until a pump coin is ready to execute.',
      };
    }

    const items = picks.map((pick) => {
      const horizonWindow = describeHorizonWindow(pick.horizon ?? '1-3 days');
      const dirLabel = pick.direction === 'bearish' ? 'Bear' : 'Bull';
      return `${pick.asset} ${dirLabel} until ${horizonWindow.untilLabel}: entry ${formatPrice(pick.entry)}, TP ${formatPrice(
        pick.tp
      )}, SL ${formatPrice(pick.sl)}.`;
    });

    return {
      headline: `${picks.length} top pump picks are ready to execute today.`,
      items,
      action: 'Prioritize these pump coins before entering other pairs.',
    };
  }, [describeHorizonWindow, formatPrice, normalizeAssetFromPair, pumpList, topPicks]);

  const pumpChartPicks = useMemo(
    () => {
      const prioritized = topPicks.filter((pick) => pumpList.some((p) => p.pair === pick.pair)).slice(0, 2);
      const fallback = pumpList.slice(0, 2).map((coin) => ({
        pair: coin.pair,
        asset: normalizeAssetFromPair(coin.pair),
        direction: coin.pricePhase === 'baru_mau_naik' ? 'bullish' : 'neutral',
        horizon: '1-3 days',
      }));
      const picks = (prioritized.length ? prioritized : fallback).slice(0, 2);

      return picks
        .map((pick) => {
          const coin = coins.find((c) => c.pair === pick.pair);
          if (!coin) return null;

          const posPct = Math.max(0, Math.min(100, coin.posInRange * 100));
          const momentum = coin.moveFromLowPct.toFixed(1);
          const rrNote = coin.rr >= 2 ? 'Strong RR' : coin.rr >= 1.6 ? 'Solid RR' : 'Limited RR';
          const zone =
            posPct >= 75
              ? 'near daily high (watch overheating)'
              : posPct <= 40
                ? 'near daily low (ready to accumulate)'
                : 'mid-range';
          const horizonWindow = describeHorizonWindow(pick.horizon ?? '1-3 days');
          const biasLabel = pick.direction === 'bearish' ? 'Bear' : pick.direction === 'neutral' ? 'Neutral' : 'Bull';
          const progression =
            coin.last >= coin.tp * 0.98
              ? 'Near the primary TP—plan staged profit taking.'
              : coin.last <= coin.entry * 0.98
                ? 'Still below/around entry—accumulation opportunity is open.'
                : 'Above entry—continue holding while monitoring volume.';

          const rangeWidthPct = ((coin.high - coin.low) / coin.last) * 100;
          const support = formatPrice(coin.low);
          const resistance = formatPrice(coin.high);

          const detailPoints = [
            `${biasLabel} until ${horizonWindow.untilLabel} · RR ${coin.rr.toFixed(2)} · range ${rangeWidthPct
              .toFixed(1)}% (vol ${formatPrice(coin.volIdr)} IDR).`,
            `Price ${formatPrice(coin.last)} IDR at ${posPct.toFixed(1)}% of the 24h range (${zone}); support ${support}, resistance ${resistance}.`,
            `Momentum from low ${momentum}% · Entry ${formatPrice(coin.entry)} · TP ${formatPrice(coin.tp)} · SL ${formatPrice(coin.sl)}.`,
            progression,
          ];

          return {
            coin,
            brief: `${pick.asset} ${biasLabel} until ${horizonWindow.untilLabel}: ${momentum}% from 24h low, ${rrNote}, position ${posPct.toFixed(
              1
            )}% (${zone}).`,
            action: `Entry ${formatPrice(coin.entry)} · TP ${formatPrice(coin.tp)} · SL ${formatPrice(coin.sl)} · ${progression}`,
            detailPoints,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    },
    [coins, describeHorizonWindow, formatPrice, normalizeAssetFromPair, pumpList, topPicks]
  );

  const menuSections = useMemo(
    () => [
      {
        id: 'priority',
        title: 'Buy & Hold Priority',
        summary: topPickInsight.summary,
        action: topPickInsight.action,
      },
      {
        id: 'risk',
        title: 'Anti-Bag & Recovery',
        summary: drawdownInsight.summary,
        action: drawdownInsight.actions[0] ?? 'Lock small losses and avoid getting stuck.',
      },
      {
        id: 'pump-math',
        title: 'Pump Math Lab',
        summary: pumpMathInsight.summary,
        action: pumpMathInsight.action,
      },
      {
        id: 'radar',
        title: 'Pump Alert Radar',
        summary: radarInsight.summary,
        action: radarInsight.action,
      },
      {
        id: 'news',
        title: 'News & Sentiment',
        summary: newsInsight.summary,
        action: newsInsight.action,
      },
      {
        id: 'predictions',
        title: '1-Week Predictions',
        summary: predictionInsight.summary,
        action: predictionInsight.action,
      },
      {
        id: 'pump-list',
        title: 'About to Pump List',
        summary: pumpInsight.summary,
        action: pumpInsight.action,
      },
      {
        id: 'table',
        title: 'Detail Table',
        summary: pumpInsight.summary,
        action: pumpInsight.action,
      },
    ],
    [drawdownInsight, newsInsight, predictionInsight, pumpInsight, pumpMathInsight, radarInsight, topPickInsight]
  );

  if (!authChecked) {
    return (
      <main className="pin-gate">
        <div className="pin-card">
          <h1>Verifying access...</h1>
          <p className="muted">Loading saved permissions.</p>
        </div>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="pin-gate">
        <div className="pin-card">
          <h1>Access SINTA Crypto Detector</h1>
          <p className="muted">Enter the PIN to unlock the dashboard.</p>

          <form className="pin-form" onSubmit={handlePinSubmit}>
            <label htmlFor="pin-input">Access PIN</label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              placeholder="Enter 6-digit PIN"
              className={pinError ? 'has-error' : ''}
            />
            {pinError && <div className="error-text">{pinError}</div>}
            <button type="submit" className="button">
              Unlock
            </button>
          </form>
        </div>
      </main>
    );
  }

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
            {loading ? 'Loading...' : 'Refresh data'}
          </button>
        </div>
      </header>

      <section className="market-brief section-card accent-market">
        <div className="market-brief-head">
          <div className="market-brief-label">BTC/USD Summary</div>
          <div className="market-brief-pill">Combined takeaway</div>
        </div>
        <div className="market-brief-body">
          <div className="market-brief-main">{btcMarketSummary.line}</div>
          <div className="market-brief-hint">{btcMarketSummary.caution}</div>
          <div className="market-brief-action">{btcMarketSummary.action}</div>
          <div className="market-brief-divider" />
          <div className="market-brief-subhead">Top pick to execute today</div>
          <div className="market-brief-main">{bestTodaySummary.headline}</div>
          <div className="market-brief-action">{bestTodaySummary.action}</div>
          <div className="market-brief-divider" />
          <div className="market-brief-subhead">Top pump pick today</div>
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
            <h3>Navigation Menu</h3>
            <ul>
              {menuSections.map((section) => (
                <li key={section.id} className={`sidebar-menu-item accent-${section.id}`}>
                  <a href={`#${section.id}`} className="sidebar-menu-link">
                    <div className="sidebar-menu-title-row">
                      <div className="sidebar-menu-title">{section.title}</div>
                      <span className="sidebar-chip">Quick action</span>
                    </div>
                    <div className="sidebar-meta">
                      <span className="sidebar-label">Summary</span>
                      <div className="sidebar-menu-summary">{section.summary}</div>
                    </div>
                    <div className="sidebar-meta">
                      <span className="sidebar-label accent">Advice</span>
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
                <h2>Buy & Hold Priority to TP</h2>
                <p className="muted">
                  Combines about-to-pump signals, weekly predictions, and RR to spotlight the most reliable coins to hold through TP.
                </p>
              </div>
              <span className="badge badge-strong">Live with predictions & signals</span>
            </div>

            {topPicks.length === 0 ? (
              <div className="empty-state small">Waiting for signals and predictions to align. They will appear once data is ready.</div>
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

          <section id="risk" className="section-card accent-risk">
            <div className="section-head">
              <div>
                <h3>Anti-Bag & Recovery Plan</h3>
                <p className="muted">
                  Review positions that have not hit TP so they do not turn into deep losses.
                </p>
              </div>
              <span className="badge badge-danger">Protection</span>
            </div>

            <div className="risk-grid">
              <div className="risk-summary">
                <div className="risk-summary-title">{drawdownInsight.summary}</div>
                <ul className="risk-actions">
                  {drawdownInsight.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>

              <div className="risk-list">
                {drawdownInsight.items.length === 0 ? (
                  <div className="empty-state small">No about-to-pump positions need monitoring yet.</div>
                ) : (
                  <ul>
                    {drawdownInsight.items.map((item) => (
                      <li key={item.pair} className={`risk-item risk-${item.status}`}>
                        <div className="risk-item-head">
                          <div className="risk-item-title">{item.pair.toUpperCase()}</div>
                          <span className="badge badge-neutral">
                            P/L {item.pnlPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="risk-item-line">{item.headline}</div>
                        <div className="risk-item-sub">{item.guidance}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section id="pump-math" className="section-card accent-math">
            <div className="section-head">
              <div>
                <h3>Pump Math Lab</h3>
                <p className="muted">
                  Live calculations for RR, TP/SL distance, gap to entry, range heat, sideways history, BTC effect, and mini upside/downside chart to increase execution confidence.
                </p>
              </div>
              <span className="badge badge-strong">Real-time numbers</span>
            </div>

            {pumpMathList.length === 0 ? (
              <div className="empty-state small">Waiting for an about-to-pump signal to calculate.</div>
            ) : (
            <div className="pump-math-grid">
              {pumpMathList.slice(0, 4).map((item) => (
                <div key={item.coin.pair} className={`pump-math-card bias-${item.bias}`}>
                  <div className="pump-math-head">
                    <div>
                        <div className="pump-math-pair">{item.coin.pair.toUpperCase()}</div>
                        <div className="pump-math-sub">Volume {formatter.format(item.coin.volIdr)} IDR</div>
                      </div>
                      <div className="pump-math-score">Score {item.score}</div>
                    </div>

                    <div className="pump-math-metrics">
                      <div>
                        <div className="metric-label">Upside → TP</div>
                        <div className="metric-value">{item.upsidePct.toFixed(1)}%</div>
                        <div className="metric-sub">Distance from last price to TP</div>
                      </div>
                      <div>
                        <div className="metric-label">Cushion → SL</div>
                        <div className="metric-value">{item.downsidePct.toFixed(1)}%</div>
                        <div className="metric-sub">Drop allowed before hitting SL</div>
                      </div>
                      <div>
                        <div className="metric-label">RR live</div>
                        <div className="metric-value">{item.rrLive.toFixed(2)}x</div>
                        <div className="metric-sub">Comparing current upside vs downside</div>
                      </div>
                      <div>
                        <div className="metric-label">Gap ke Entry</div>
                        <div className="metric-value">{item.entryGapPct.toFixed(1)}%</div>
                        <div className="metric-sub">Negative = still discounted</div>
                      </div>
                      <div>
                        <div className="metric-label">Heat 24j</div>
                        <div className="metric-value">{item.heatPct.toFixed(1)}%</div>
                        <div className="metric-sub">Position within low-high range</div>
                      </div>
                      <div>
                        <div className="metric-label">Momentum</div>
                        <div className="metric-value">{item.momentumPct.toFixed(1)}%</div>
                        <div className="metric-sub">Gain from 24h low</div>
                      </div>
                    </div>

                    <div className="pump-math-diagnosis">
                      <div>
                        <div className="diag-label">Conviction</div>
                        <div className={`diag-value ${item.convictionLabel === 'A' ? 'grade-a-text' : ''}`}>
                          {item.convictionLabel}
                        </div>
                        <div className="diag-sub">{item.convictionNote}</div>
                      </div>
                      <div>
                        <div className="diag-label">Liquidity</div>
                        <div className="diag-value">{item.liquidityLabel}</div>
                        <div className="diag-sub">Volume {formatter.format(item.coin.volIdr)} IDR</div>
                      </div>
                      <div>
                        <div className="diag-label">Safeguard</div>
                        <div className="diag-value">{item.riskNote}</div>
                        <div className="diag-sub">Keep SL ready and avoid FOMO</div>
                      </div>
                    </div>

                    <div className="pump-math-history">
                      <div className="history-block">
                        <div className="history-label">Sideways & history</div>
                        <div className="history-value">{item.sidewayLabel}</div>
                        <div className="history-sub">{item.sidewayNote}</div>
                      </div>
                      <div className="history-block">
                        <div className="history-label">Break & midline</div>
                        <div className="history-value">{item.structureNote}</div>
                        <div className="history-sub">{item.historyNote}</div>
                      </div>
                      <div className="history-block">
                        <div className="history-label">BTC effect</div>
                        <div className="history-value">{item.btcDrag}</div>
                        <div className="history-sub">Confidence {item.confidencePct}%</div>
                      </div>
                    </div>

                    <div className="pump-math-spark">
                      <div className="spark-label">Mini chart: live upside vs downside</div>
                      <div className="spark-track">
                        <div className="spark-bar">
                          <span
                            className="spark-up"
                            style={{ width: `${Math.min(100, Math.max(0, item.upsidePct))}%` }}
                          />
                        </div>
                        <div className="spark-bar">
                          <span
                            className="spark-down"
                            style={{ width: `${Math.min(100, Math.max(0, item.downsidePct * 2))}%` }}
                          />
                        </div>
                      </div>
                      <div className="spark-meta">
                        Upside {item.upsidePct.toFixed(1)}% • Downside {item.downsidePct.toFixed(1)}% • Heat {item.heatPct.toFixed(
                          1
                        )}% • Momentum {item.momentumPct.toFixed(1)}%
                      </div>
                    </div>

                    <div className="pump-math-action">{item.actionLine}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="grade-a" className="section-card accent-math">
            <div className="section-head">
              <div>
                <h3>Koin Grade A &lt; 1000 IDR</h3>
                <p className="muted">
                  Fokus koin harga murah dengan grade A. Sorot warna untuk status <span className="indo-pill label">penting</span> dalam bahasa Indo.
                </p>
              </div>
              <span className="badge badge-strong">Filter murah</span>
            </div>

            {gradeACheapList.length === 0 ? (
              <div className="empty-state small">Belum ada koin grade A di bawah 1000 IDR.</div>
            ) : (
              <ul className="side-list">
                {gradeACheapList.map((item) => (
                  <li key={item.pair} className="side-list-item">
                    <div className="side-list-title">
                      <span className="grade-a-text">{item.pair.toUpperCase()}</span>
                      <span className="badge badge-buy">Grade A</span>
                    </div>
                    <div className="side-list-sub">Last {formatPrice(item.last)} IDR • Entry {formatPrice(item.entry)} • TP {formatPrice(item.tp)}</div>
                    <div className="side-list-sub">RR live {item.rr.toFixed(2)} • Momentum {item.momentum.toFixed(1)}%</div>
                    <div className="side-list-sub">
                      <span className={`indo-pill ${item.isPumped ? 'hot' : 'calm'}`}>
                        {item.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="radar" className="side-section section-card accent-radar">
            <h3>Pump Alert Radar</h3>
            {warnings.length === 0 ? (
              <p className="muted">No new alerts yet. Check regularly so you do not miss momentum.</p>
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
                      {formatRelativeTime(warn.time)} • Up from 24h low ~{warn.moveFromLowPct.toFixed(1)}% • Volume {formatter.format(warn.volIdr)} IDR
                    </div>
                    <div className="side-list-sub muted">
                      Price {formatPrice(warn.last)} | Entry {formatPrice(warn.entry)} | TP {formatPrice(warn.tp)} | SL {formatPrice(warn.sl)} | RR {warn.rr.toFixed(1)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="news" className="side-section section-card accent-news">
            <h3>Latest News & Sentiment</h3>
            {newsError && <div className="error-box">{newsError}</div>}
            <div className="news-bias">
              <span className={`bias-pill bias-${newsInsight.biasLabel.toLowerCase()}`}>
                Summary: {newsInsight.biasLabel}
              </span>
              <div className="news-bias-detail">{newsInsight.biasDetail}</div>
            </div>
            {news.length === 0 ? (
              <p className="muted">No news to display yet.</p>
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
                      {item.source} • Impact {item.impact} • Assets: {item.assets.join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="predictions" className="side-section section-card accent-predictions">
            <h3>Crypto & Coin Predictions for the Next Week</h3>
            {predictions.length === 0 ? (
              <p className="muted">Weekly predictions will appear after coin and news data load.</p>
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
                    <div className="side-list-sub">Confidence {pred.confidence}% • Horizon {pred.horizon}</div>
                    <div className="side-list-sub">{pred.rationale}</div>
                    <div className="side-list-sub muted">Advice: {pred.suggestedAction}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="pump-list" className="side-section section-card accent-pump">
            <h3>About-to-Pump Coin List</h3>
            <p className="muted">Click a coin to show details, charts, and TP 1/2/3 below.</p>
            {pumpList.length === 0 ? (
              <p className="muted">No coins detected as about to pump yet.</p>
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
                      <span className="badge badge-pump">About to pump</span>
                    </div>
                    <div className="side-list-sub">Up from 24h low ~{c.moveFromLowPct.toFixed(1)}%</div>
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
                    <h3>Signal Reasons</h3>
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
                    ? 'Fetching coin data...'
                    : 'Click one of the about-to-pump coins above to see details.'}
                </div>
              )}
            </div>
          </section>

          <section id="table" className="table-section section-card accent-detail">
            <h2>About-to-pump coins</h2>
            <CoinTable
              coins={pumpList}
              selectedPair={selected?.pair ?? null}
              onSelectCoin={setSelected}
            />
          </section>

          <section id="pump-charts" className="section-card accent-chart pump-chart-section">
            <div className="pump-chart-head">
              <div>
                <h3>Indodax charts for the top 2 pump picks</h3>
                <p className="muted">
                  Live charts from Indodax plus full analysis (bias, horizon, support/resistance, momentum, actions) to execute the top pump coins with more confidence.
                </p>
              </div>
              <span className="badge badge-pump">Live</span>
            </div>

            {pumpChartPicks.length === 0 ? (
              <div className="empty-state small">No top picks to analyze on charts yet.</div>
            ) : (
              <div className="pump-chart-grid">
                {pumpChartPicks.map((item) => (
                  <div key={item.coin.pair} className="pump-chart-card">
                    <div className="chart-brief">
                      <div className="chart-brief-title">{item.coin.pair.toUpperCase()}</div>
                      <div className="chart-brief-line">{item.brief}</div>
                      <div className="chart-brief-sub">{item.action}</div>
                    </div>

                    <IndodaxChart pair={item.coin.pair} />

                    <div className="chart-analysis">
                      <div className="chart-analysis-title">Full analysis</div>
                      <ul>
                        {item.detailPoints.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          </div>
        </div>
      </div>

      <footer className="page-footer">
        Dashboard version {lastUpdatedLabel} WIB — latest updates to pump analysis, sideways history, BTC effect, and mini charts.
      </footer>
    </main>
  );
}
