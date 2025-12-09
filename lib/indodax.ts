import type { RawTicker } from './sintaLogic';

export function parseTickersResponse(data: any): RawTicker[] {
  const result: RawTicker[] = [];
  if (!data) return result;

  const tickers = (data as any).tickers ?? data;
  if (!tickers || typeof tickers !== 'object') {
    return result;
  }

  for (const [pair, info] of Object.entries(tickers as Record<string, any>)) {
    if (!info || typeof info !== 'object') continue;

    const last = Number((info as any).last);
    const high = Number((info as any).high);
    const low = Number((info as any).low);
    const buy = Number((info as any).buy);
    const sell = Number((info as any).sell);

    const volIdrRaw =
      (info as any).vol_idr ?? (info as any).vol_id ?? (info as any).vol_traded ?? 0;
    const volIdr = Number(volIdrRaw) || 0;

    if (!isFinite(last) || !isFinite(high) || !isFinite(low)) {
      continue;
    }

    result.push({
      pair,
      last,
      high,
      low,
      buy: isFinite(buy) ? buy : last,
      sell: isFinite(sell) ? sell : last,
      volIdr,
    });
  }

  return result;
}
