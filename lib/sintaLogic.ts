export type Signal = 'strong_buy' | 'buy' | 'watch' | 'none';
export type PricePhase = 'baru_mau_naik' | 'sudah_telanjur_naik' | 'normal';
export type PumpStatus = 'mau_pump' | 'none';

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

const MIN_VOL_IDR = 30_000_000; // minimal volume IDR agar dianggap layak
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

function computeSwingLevels(
  last: number,
  high: number,
  low: number,
  posInRange: number,
  moveFromLowPct: number
): SwingLevels | null {
  if (!isFinite(last) || last <= 0 || !isFinite(high) || !isFinite(low) || high <= 0 || low <= 0) {
    return null;
  }

  const baseRange = high > low ? high - low : last * 0.03;
  if (!isFinite(baseRange) || baseRange <= 0) return null;

  // Entry utamakan harga dasar (dekat low) agar tidak telanjur mengejar harga.
  const pullbackFactor =
    moveFromLowPct >= 18 ? 0.16 : moveFromLowPct >= 10 ? 0.22 : 0.3;
  const baseEntry = low + baseRange * pullbackFactor;
  const shouldStayNear = posInRange <= 0.35;
  let entry = shouldStayNear ? Math.min(last, baseEntry) : baseEntry;
  if (entry < low * 1.01) entry = low * 1.01;
  if (entry <= 0) entry = last * 0.99;

  // SL di bawah low untuk mencegah nyangkut saat koreksi.
  let sl = Math.min(entry * 0.97, low * 0.985);
  if (sl <= 0) sl = entry * 0.95;

  const riskAmt = entry - sl;
  if (!isFinite(riskAmt) || riskAmt <= 0) {
    return null;
  }

  // TP diarahkan ke area tengah-atas range, atau minimal RR 2.6x.
  const tpFromRange = entry + baseRange * 0.65;
  const tpFromRisk = entry + riskAmt * 2.6;
  let tp = Math.max(tpFromRange, tpFromRisk);
  if (tp <= entry) {
    tp = entry + Math.max(riskAmt * 2.6, baseRange * 0.5);
  }

  if (!isFinite(tp) || tp <= entry) {
    return null;
  }

  const rewardPct = ((tp - entry) / entry) * 100;
  const rr = (tp - entry) / riskAmt;

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
    return 'sudah_telanjur_naik';
  }

  if (
    posInRange >= 0.25 &&
    posInRange <= 0.6 &&
    moveFromLowPct >= 3 &&
    moveFromLowPct <= 20
  ) {
    return 'baru_mau_naik';
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

  const notTooHigh = posInRange <= 0.72 && moveFromLowPct <= 32;

  if (
    notTooHigh &&
    posInRange >= 0.55 &&
    moveFromLowPct >= 8 &&
    volIdr >= 150_000_000 &&
    range / last >= 0.05
  ) {
    return 'mau_pump';
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
  if (pricePhase === 'sudah_telanjur_naik') return 'none';

  const goodRr = rr >= 2;
  const okRr = rr >= 1.6;
  const tpOk = tpFromEntryPct >= 8;

  const nearLow = posInRange <= 0.6;
  const notTooHigh = posInRange <= 0.72;

  const moveHealthy = moveFromLowPct >= 3 && moveFromLowPct <= 28;

  if (
    volIdr >= STRONG_VOL_IDR &&
    goodRr &&
    tpOk &&
    nearLow &&
    moveHealthy
  ) {
    return 'strong_buy';
  }

  if (
    volIdr >= STRONG_VOL_IDR * 0.7 &&
    okRr &&
    tpOk &&
    notTooHigh
  ) {
    return 'buy';
  }

  if (
    volIdr >= WATCH_MIN_VOL_IDR &&
    (pricePhase === 'baru_mau_naik' || pumpStatus === 'mau_pump') &&
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
      `Sinyal STRONG BUY untuk swing: potensi TP sekitar ${tpPctText}% dengan risiko sekitar ${slPctText}% (R:R ≈ ${rrText}).`
    );
  } else if (coin.signal === 'buy') {
    reasons.push(
      `Sinyal BUY untuk swing: potensi TP sekitar ${tpPctText}% dengan risiko sekitar ${slPctText}% (R:R ≈ ${rrText}).`
    );
  } else if (coin.signal === 'watch') {
    reasons.push(
      `Koin berada di watchlist (siap-siap BUY): potensi TP sekitar ${tpPctText}% dengan risiko sekitar ${slPctText}% (R:R ≈ ${rrText}).`
    );
  }

  const posPct = (coin.posInRange * 100).toFixed(1);
  const moveLowPct = coin.moveFromLowPct.toFixed(1);
  const rangePct = coin.last > 0 ? ((coin.range / coin.last) * 100).toFixed(1) : '0';

  if (coin.pricePhase === 'baru_mau_naik') {
    reasons.push(
      `Harga berada di bagian bawah–tengah range 24 jam (~${posPct}% dari low ke high) dan sudah naik sekitar ${moveLowPct}% dari low, mengindikasikan awal kenaikan.`
    );
  } else if (coin.pricePhase === 'sudah_telanjur_naik') {
    reasons.push(
      `Harga sudah mendekati high 24 jam (~${posPct}% dari low ke high) dan telah naik sekitar ${moveLowPct}% dari low; jangan kejar. Entry aman menunggu harga turun dekat area dasar.`
    );
  } else {
    reasons.push(
      `Posisi harga saat ini berada di area tengah range 24 jam (~${posPct}% dari low ke high), kondisi cenderung netral.`
    );
  }

  if (coin.pumpStatus === 'mau_pump') {
    const volM = (coin.volIdr / 1_000_000).toFixed(1);
    reasons.push(
      `Volume 24 jam tinggi (~${volM} M IDR) dan kenaikan dari low 24 jam cukup besar (~${moveLowPct}%), mengindikasikan potensi PUMP / momentum kuat.`
    );
  }

  reasons.push(
    `Range harga harian (high-low) sekitar ${rangePct}% dari harga sekarang, cukup lebar untuk target swing beberapa hari (bukan scalping).`
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v);

  reasons.push(
    `Level trading yang disarankan: Entry sekitar ${fmt(coin.entry)} IDR, TP di ${fmt(
      coin.tp
    )} IDR, dan SL di ${fmt(coin.sl)} IDR.`
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

    const swing = computeSwingLevels(last, high, low, posInRange, moveFromLowPct);
    if (!swing) continue;

    const pricePhase = getPricePhase(last, high, low);
    const pumpStatus = getPumpStatus(last, high, low, volIdr);

  let signal = getSignal({
    volIdr,
    posInRange,
    moveFromLowPct,
    rr: swing.rr,
    pricePhase,
    pumpStatus,
    tpFromEntryPct: swing.tpFromEntryPct,
  });

  if (signal === 'none') {
    const allowLateWatch =
      pumpStatus === 'mau_pump' && pricePhase === 'sudah_telanjur_naik' && volIdr >= WATCH_MIN_VOL_IDR;
    if (allowLateWatch) {
      signal = 'watch';
    } else {
      continue;
    }
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
      p === 'baru_mau_naik' ? 2 : p === 'normal' ? 1 : 0;

    const phaseDiff = phaseScore(b.pricePhase) - phaseScore(a.pricePhase);
    if (phaseDiff !== 0) return phaseDiff;

    return b.volIdr - a.volIdr;
  });

  return coins;
}
