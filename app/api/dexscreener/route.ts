import { NextResponse } from 'next/server';

const DEX_URL = 'https://api.dexscreener.com/latest/dex/search?q=solana';

export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(DEX_URL, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      console.error('DexScreener error', res.status, text);
      return NextResponse.json({ error: 'Gagal mengambil data DexScreener.' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error /api/dexscreener', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengambil data.' }, { status: 500 });
  }
}
