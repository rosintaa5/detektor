import { NextResponse } from 'next/server';
import { buildCoinSignals } from '../../../lib/sintaLogic';
import { parseTickersResponse } from '../../../lib/indodax';

const TICKERS_URL = 'https://indodax.com/api/tickers';

export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(TICKERS_URL, {
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Indodax /api/tickers error', res.status, text);
      return NextResponse.json(
        { error: 'Gagal mengambil data dari Indodax.' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawTickers = parseTickersResponse(data);
    const coins = buildCoinSignals(rawTickers);

    return NextResponse.json({ coins });
  } catch (err) {
    console.error('Error /api/tickers', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data.' },
      { status: 500 }
    );
  }
}
