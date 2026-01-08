import { NextResponse } from 'next/server';

const SUMMARIES_URL = 'https://indodax.com/api/summaries';

export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(SUMMARIES_URL, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      console.error('Indodax summaries error', res.status, text);
      return NextResponse.json({ error: 'Gagal mengambil summaries Indodax.' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error /api/indodax/summaries', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengambil data.' }, { status: 500 });
  }
}
