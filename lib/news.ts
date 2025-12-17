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
    id: 'sol-partnership',
    title: 'Solana Umumkan Kemitraan Besar dengan Raksasa Pembayaran',
    source: 'PayStream',
    summary: 'Integrasi pembayaran lintas chain dijanjikan membawa merchant on-chain arus utama ke ekosistem Solana.',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['SOL'],
    impact: 'high',
  },
  {
    id: 'layerzero-airdrop',
    title: 'Isu Airdrop LayerZero Dorong Aktivitas Bridge',
    source: 'Airdrop Hunter',
    summary: 'Spekulasi poin dan snapshot terbaru memicu lonjakan bridging lintas chain.',
    publishedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['ZRO', 'ETH', 'ARB'],
    impact: 'medium',
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
    id: 'ltc-halving',
    title: 'Litecoin Mendekati Halving, Hashrate Sentuh Puncak Baru',
    source: 'MinerTalk',
    summary: 'Para miner meningkatkan kapasitas menjelang halving, memicu spekulasi pasokan berkurang.',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['LTC', 'BTC'],
    impact: 'medium',
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
    id: 'eth-etf-delay',
    title: 'Keputusan ETF Ethereum Ditunda Regulator AS',
    source: 'CoinDesk',
    summary: 'SEC meminta periode komentar tambahan sehingga peluncuran ETF ETH spot mundur dari jadwal.',
    publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ETH'],
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
    id: 'avalanche-games',
    title: 'Ekosistem Game Avalanche Dapatkan Suntikan Dana Baru',
    source: 'GameFi Insider',
    summary: 'Dana pengembang sebesar $50M diluncurkan untuk menarik studio AAA ke Avalanche.',
    publishedAt: new Date(Date.now() - 8.5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['AVAX'],
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
    id: 'sec-lawsuit',
    title: 'SEC Menambah Daftar Token dalam Gugatan Baru',
    source: 'RegWatch',
    summary: 'Regulator AS memasukkan beberapa token mid-cap sebagai sekuritas, menekan sentimen altcoin.',
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ADA', 'MATIC', 'SOL'],
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
  {
    id: 'mining-cost',
    title: 'Biaya Listrik Naik, Miner Kecil Mulai Matikan Mesin',
    source: 'Hashrate Daily',
    summary: 'Kenaikan biaya energi di beberapa wilayah memaksa miner skala kecil menjual cadangan BTC.',
    publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['BTC'],
    impact: 'medium',
  },
  {
    id: 'ton-messenger',
    title: 'Telegram Umumkan Integrasi TON Wallet Secara Default',
    source: 'Messenger Wire',
    summary: 'Pengaktifan wallet bawaan untuk jutaan pengguna memicu lonjakan alamat baru di jaringan TON.',
    publishedAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['TON'],
    impact: 'high',
  },
  {
    id: 'defi-tvlslide',
    title: 'TVL DeFi Turun 8% dalam Sepekan',
    source: 'DeFi Pulse',
    summary: 'Penurunan harga altcoin dan aksi profit-taking menekan total value locked di berbagai chain.',
    publishedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ETH', 'AVAX', 'SOL'],
    impact: 'medium',
  },
  {
    id: 'ordo-btc',
    title: 'Volume Ordinals Naik, Biaya Transaksi BTC Ikut Melonjak',
    source: 'Onchain Radar',
    summary: 'Lonjakan inscription kembali memadati mempool dan menunda konfirmasi bagi transaksi kecil.',
    publishedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    sentiment: 'neutral',
    assets: ['BTC'],
    impact: 'low',
  },
];

export async function getNewsFeed(): Promise<NewsItem[]> {
  return SAMPLE_NEWS.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
