export type Signal = 'strong_buy' | 'buy' | 'watch' | 'none';
export type PricePhase = 'starting_to_rise' | 'already_run_up' | 'normal';
export type PumpStatus = 'potential_pump' | 'none';

export interface RawTicker {
  pair: string;
  last: number;
  high: number;
  low: number;
  buy: number;
  sell: number;
  volIdr: number;
}

export interface CoinSignal extends RawTicker {
  range: number;
  posInRange: number;
  moveFromLowPct: number;
  moveFromHighPct: number;
  entry: number;
  tp: number;
  sl: number;
  tpFromEntryPct: number;
  slFromEntryPct: number;
  rr: number;
  signal: Signal;
  pricePhase: PricePhase;
  pumpStatus: PumpStatus;
  reasons: string[];
}

const MIN_VOL_IDR = 30_000_000; // Minimum IDR volume to be considered viable
const WATCH_MIN_VOL_IDR = 20_000_000;
const STRONG_VOL_IDR = 100_000_000;

interface SwingLevels {
  entry: number;
  tp: number;
  sl: number;
  tpFromEntryPct: number;
  slFromEntryPct: number;
  rr: number;
}

function computeSwingLevels(last: number, high: number, low: number): SwingLevels | null {
  if (!isFinite(last) || last <= 0) return null;

  const baseRange = high > low ? high - low : last * 0.03;
  let atrApprox = baseRange / 1.8;
  if (!isFinite(atrApprox) || atrApprox <= 0) {
    atrApprox = last * 0.03;
  }

  const dipAmount = Math.min(last * 0.005, atrApprox * 0.3); // small pullback buffer
  let entry = last - dipAmount;
  if (entry <= 0) entry = last * 0.99;

  let riskAmt = Math.max(entry * 0.03, atrApprox * 1.2); // minimum 3% or 1.2x ATR approx
  let sl = entry - riskAmt;
  if (sl <= 0) {
    sl = entry * 0.95;
    riskAmt = entry - sl;
  }

  let rewardAmt = Math.max(entry * 0.12, atrApprox * 3); // minimum 12% or 3x ATR approx
  let tp = entry + rewardAmt;

  const riskPct = ((entry - sl) / entry) * 100;
  let rewardPct = ((tp - entry) / entry) * 100;

  const maxRiskPct = 8;
  if (riskPct > maxRiskPct) {
    const maxRiskAmt = (maxRiskPct / 100) * entry;
    sl = entry - maxRiskAmt;
  }

  const finalRisk = entry - sl;
  rewardAmt = tp - entry;

  if (!isFinite(finalRisk) || finalRisk <= 0) {
    return null;
  }

  if (rewardAmt < finalRisk * 2) {
    rewardAmt = finalRisk * 2;
    tp = entry + rewardAmt;
  }

  rewardPct = ((tp - entry) / entry) * 100;
  const rr = (tp - entry) / finalRisk;

  return {
    entry,
    tp,
    sl,
    tpFromEntryPct: rewardPct,
    slFromEntryPct: ((entry - sl) / entry) * 100,
    rr,
  };
}

function getPricePhase(last: number, high: number, low: number): PricePhase {
  if (
    !isFinite(last) ||
    !isFinite(high) ||
    !isFinite(low) ||
    last <= 0 ||
    high <= 0 ||
    low <= 0 ||
    high <= low
  ) {
    return 'normal';
  }

  const range = high - low;
  const posInRange = (last - low) / range;
  const moveFromLowPct = ((last - low) / low) * 100;

  if (posInRange >= 0.85 && moveFromLowPct >= 20) {
    return 'already_run_up';
  }

  if (
    posInRange >= 0.25 &&
    posInRange <= 0.6 &&
    moveFromLowPct >= 3 &&
    moveFromLowPct <= 20
  ) {
    return 'starting_to_rise';
  }

  return 'normal';
}

function getPumpStatus(
  last: number,
  high: number,
  low: number,
  volIdr: number
): PumpStatus {
  if (
    !isFinite(last) ||
    !isFinite(high) ||
    !isFinite(low) ||
    last <= 0 ||
    high <= 0 ||
    low <= 0 ||
    high <= low
  ) {
    return 'none';
  }

  const range = high - low;
  const posInRange = (last - low) / range;
  const moveFromLowPct = ((last - low) / low) * 100;

  if (
    posInRange >= 0.7 &&
    moveFromLowPct >= 12 &&
    volIdr >= 150_000_000 &&
    range / last >= 0.05
  ) {
    return 'potential_pump';
  }

  return 'none';
}

function getSignal(args: {
  volIdr: number;
  posInRange: number;
  moveFromLowPct: number;
  rr: number;
  pricePhase: PricePhase;
  pumpStatus: PumpStatus;
  tpFromEntryPct: number;
}): Signal {
  const { volIdr, posInRange, moveFromLowPct, rr, pricePhase, pumpStatus, tpFromEntryPct } =
    args;

  if (!Number.isFinite(rr) || rr <= 1) return 'none';
  if (volIdr < MIN_VOL_IDR) return 'none';

  const goodRr = rr >= 2;
  const okRr = rr >= 1.6;
  const tpOk = tpFromEntryPct >= 8;

  const nearLow = posInRange <= 0.6;
  const notTooHigh = posInRange <= 0.85;

  const moveHealthy = moveFromLowPct >= 3 && moveFromLowPct <= 40;

  if (
    volIdr >= STRONG_VOL_IDR &&
    goodRr &&
    tpOk &&
    pricePhase !== 'already_run_up' &&
    nearLow &&
    moveHealthy
  ) {
    return 'strong_buy';
  }

  if (
    volIdr >= STRONG_VOL_IDR * 0.7 &&
    okRr &&
    tpOk &&
    pricePhase !== 'already_run_up' &&
    notTooHigh
  ) {
    return 'buy';
  }

  if (
    volIdr >= WATCH_MIN_VOL_IDR &&
    (pricePhase === 'starting_to_rise' || pumpStatus === 'potential_pump') &&
    tpFromEntryPct >= 5 &&
    rr >= 1.3
  ) {
    return 'watch';
  }

  return 'none';
}

function buildReasons(coin: CoinSignal): string[] {
  const reasons: string[] = [];

  const rrText = coin.rr.toFixed(2);
  const tpPctText = coin.tpFromEntryPct.toFixed(1);
  const slPctText = coin.slFromEntryPct.toFixed(1);

  if (coin.signal === 'strong_buy') {
    reasons.push(
      `STRONG BUY signal for swing: potential TP around ${tpPctText}% with risk around ${slPctText}% (R:R ≈ ${rrText}).`
    );
  } else if (coin.signal === 'buy') {
    reasons.push(
      `BUY signal for swing: potential TP around ${tpPctText}% with risk around ${slPctText}% (R:R ≈ ${rrText}).`
    );
  } else if (coin.signal === 'watch') {
    reasons.push(
      `Coin is on the watchlist (preparing for BUY): potential TP around ${tpPctText}% with risk around ${slPctText}% (R:R ≈ ${rrText}).`
    );
  }

  const posPct = (coin.posInRange * 100).toFixed(1);
  const moveLowPct = coin.moveFromLowPct.toFixed(1);
  const rangePct = coin.last > 0 ? ((coin.range / coin.last) * 100).toFixed(1) : '0';

  if (coin.pricePhase === 'starting_to_rise') {
    reasons.push(
      `Price sits in the lower–middle portion of the 24h range (~${posPct}% from low to high) and has climbed about ${moveLowPct}% from the low, indicating an early climb.`
    );
  } else if (coin.pricePhase === 'already_run_up') {
    reasons.push(
      `Price is near the 24h high (~${posPct}% from low to high) and has risen about ${moveLowPct}% from the low; pullback risk is elevated, so entries require extra caution.`
    );
  } else {
    reasons.push(
      `Current price is in the middle of the 24h range (~${posPct}% from low to high), indicating a neutral setup.`
    );
  }

  if (coin.pumpStatus === 'potential_pump') {
    const volM = (coin.volIdr / 1_000_000).toFixed(1);
    reasons.push(
      `24h volume is high (~${volM} M IDR) and the move from the 24h low is significant (~${moveLowPct}%), indicating a potential PUMP / strong momentum.`
    );
  }

  reasons.push(
    `The daily price range (high-low) is about ${rangePct}% of the current price, wide enough for multi-day swing targets (not scalping).`
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

  reasons.push(
    `Suggested trading levels: Entry around ${fmt(coin.entry)} IDR, TP at ${fmt(
      coin.tp
    )} IDR, and SL at ${fmt(coin.sl)} IDR.`
  );

  return reasons;
}

export function buildCoinSignals(rawTickers: RawTicker[]): CoinSignal[] {
  const coins: CoinSignal[] = [];

  for (const t of rawTickers) {
    const { pair } = t;
    if (!pair.endsWith('_idr')) continue;

    const last = t.last;
    const high = t.high;
    const low = t.low;
    const volIdr = t.volIdr ?? 0;

    if (
      !isFinite(last) ||
      !isFinite(high) ||
      !isFinite(low) ||
      last <= 0 ||
      high <= 0 ||
      low <= 0
    ) {
      continue;
    }

    const range = high > low ? high - low : last * 0.03;
    const posInRange = high > low ? (last - low) / (high - low) : 0.5;
    const moveFromLowPct = low > 0 ? ((last - low) / low) * 100 : 0;
    const moveFromHighPct = high > 0 ? ((high - last) / high) * 100 : 0;

    const swing = computeSwingLevels(last, high, low);
    if (!swing) continue;

    const pricePhase = getPricePhase(last, high, low);
    const pumpStatus = getPumpStatus(last, high, low, volIdr);

    const signal = getSignal({
      volIdr,
      posInRange,
      moveFromLowPct,
      rr: swing.rr,
      pricePhase,
      pumpStatus,
      tpFromEntryPct: swing.tpFromEntryPct,
    });

    if (signal === 'none') {
      continue;
    }

    const coin: CoinSignal = {
      pair,
      last,
      high,
      low,
      buy: t.buy,
      sell: t.sell,
      volIdr,
      range,
      posInRange,
      moveFromLowPct,
      moveFromHighPct,
      entry: Math.round(swing.entry),
      tp: Math.round(swing.tp),
      sl: Math.round(swing.sl),
      tpFromEntryPct: swing.tpFromEntryPct,
      slFromEntryPct: swing.slFromEntryPct,
      rr: swing.rr,
      signal,
      pricePhase,
      pumpStatus,
      reasons: [],
    };

    coin.reasons = buildReasons(coin);

    coins.push(coin);
  }

  coins.sort((a, b) => {
    const rank = (s: Signal) => (s === 'strong_buy' ? 2 : s === 'buy' ? 1 : s === 'watch' ? 0 : -1);
    const diff = rank(b.signal) - rank(a.signal);
    if (diff !== 0) return diff;

    const phaseScore = (p: PricePhase) =>
      p === 'starting_to_rise' ? 2 : p === 'normal' ? 1 : 0;

    const phaseDiff = phaseScore(b.pricePhase) - phaseScore(a.pricePhase);
    if (phaseDiff !== 0) return phaseDiff;

    return b.volIdr - a.volIdr;
  });

  return coins;
}
