import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ pair: string }> }
) {
  const { pair } = await context.params;

  if (!pair) {
    return NextResponse.json({ error: 'Pair tidak valid.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://indodax.com/api/depth/${pair}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Indodax /api/depth error', res.status, text);
      return NextResponse.json(
        { error: 'Gagal mengambil orderbook Indodax.' },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error /api/depth', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil depth.' },
      { status: 500 }
    );
  }
}
