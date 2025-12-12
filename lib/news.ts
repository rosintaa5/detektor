export type Sentiment = 'bullish' | 'bearish' | 'neutral';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  publishedAt: string;
  sentiment: Sentiment;
  assets: string[];
  impact: 'high' | 'medium' | 'low';
}

const SAMPLE_NEWS: NewsItem[] = [
  {
    id: 'etf-btc-asia',
    title: 'Persetujuan ETF Bitcoin Asia Pacifik Memicu Arus Modal Baru',
    source: 'CryptoAsia',
    summary:
      'Regulator Asia Pasifik menyetujui ETF Bitcoin berbasis spot yang langsung memicu lonjakan permintaan institusi.',
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BTC', 'ETH'],
    impact: 'high',
  },
  {
    id: 'eth-dencun',
    title: 'Upgrade Dencun Turunkan Biaya L2 Hingga 60%',
    source: 'L2 Monitor',
    summary: 'Data awal menunjukkan biaya transaksi rollup turun signifikan pasca-upgrade Dencun.',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['ETH', 'OP', 'ARB'],
    impact: 'high',
  },
  {
    id: 'regulation-us',
    title: 'Rancangan Regulasi Stablecoin Masuk Parlemen AS',
    source: 'US Policy Watch',
    summary: 'Pembahasan RUU stablecoin berpotensi menunda penerbitan token baru hingga ada izin khusus.',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    sentiment: 'neutral',
    assets: ['USDT', 'USDC', 'BTC'],
    impact: 'medium',
  },
  {
    id: 'bnb-burn',
    title: 'Jadwal BNB Burn Berikutnya Dikabarkan Lebih Agresif',
    source: 'ChainPulse',
    summary: 'Perwakilan Binance memberi sinyal burn rate kuartalan akan ditingkatkan mengikuti lonjakan transaksi.',
    publishedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BNB'],
    impact: 'medium',
  },
  {
    id: 'hack-debridge',
    title: 'Eksploitasi Jembatan DeFi Menekan Kepercayaan Pasar Altcoin',
    source: 'DefiSec',
    summary: 'Serangan terbaru ke salah satu jembatan lintas chain memicu arus keluar likuiditas.',
    publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ARB', 'OP', 'SOL'],
    impact: 'high',
  },
  {
    id: 'macro-cpi',
    title: 'CPI AS Turun, Risiko Rate Cut Meningkat',
    source: 'MacroBeat',
    summary: 'Inflasi yang lebih rendah dari konsensus membuka ruang penurunan suku bunga lebih cepat.',
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BTC', 'ETH', 'GOLD'],
    impact: 'medium',
  },
];

export async function getNewsFeed(): Promise<NewsItem[]> {
  return SAMPLE_NEWS.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
