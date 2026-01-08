import { NextResponse } from 'next/server';
import { getNewsFeed } from '../../../lib/news';

export const revalidate = 0;

export async function GET() {
  try {
    const news = await getNewsFeed();
    return NextResponse.json({ news });
  } catch (err) {
    console.error('Error /api/news', err);
    return NextResponse.json(
      { error: 'An error occurred while fetching news.' },
      { status: 500 }
    );
  }
}
