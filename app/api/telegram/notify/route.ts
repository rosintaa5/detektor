import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(request: Request) {
  if (!BOT_TOKEN || !CHAT_ID) {
    return NextResponse.json(
      { error: 'Telegram belum dikonfigurasi.' },
      { status: 501 }
    );
  }

  try {
    const body = (await request.json()) as { message?: string };
    const message = body?.message?.trim();
    if (!message) {
      return NextResponse.json({ error: 'Pesan kosong.' }, { status: 400 });
    }

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Telegram notify error', res.status, text);
      return NextResponse.json({ error: 'Gagal mengirim notifikasi.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram notify error', err);
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
