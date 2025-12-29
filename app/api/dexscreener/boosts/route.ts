import { NextResponse } from 'next/server';

const BOOSTS_URL = 'https://api.dexscreener.com/token-boosts/latest/v1';

export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(BOOSTS_URL, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      console.error('DexScreener boosts error', res.status, text);
      return NextResponse.json({ error: 'Gagal mengambil data boosts.' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error /api/dexscreener/boosts', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengambil data.' }, { status: 500 });
  }
}
