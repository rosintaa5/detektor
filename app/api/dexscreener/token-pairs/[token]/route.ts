import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  if (!token) {
    return NextResponse.json({ error: 'Token tidak valid.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.dexscreener.com/token-pairs/v1/solana/${token}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('DexScreener token-pairs error', res.status, text);
      return NextResponse.json({ error: 'Gagal mengambil data token pairs.' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error /api/dexscreener/token-pairs', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengambil data.' }, { status: 500 });
  }
}
