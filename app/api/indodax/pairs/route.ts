import { NextResponse } from 'next/server';

const PAIRS_URL = 'https://indodax.com/api/pairs';

export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(PAIRS_URL, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      console.error('Indodax pairs error', res.status, text);
      return NextResponse.json({ error: 'Gagal mengambil pairs Indodax.' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error /api/indodax/pairs', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengambil data.' }, { status: 500 });
  }
}
