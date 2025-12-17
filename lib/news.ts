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
    id: 'btc-etf-inflow',
    title: 'ETF BTC Cetak Arus Masuk Tertinggi 3 Minggu, Net Inflow $480M',
    source: 'Flows Radar',
    summary: 'Setelah konsolidasi, ETF spot BTC kembali diborong institusi; basis dana hit $480M dalam 24 jam.',
    publishedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BTC'],
    impact: 'high',
  },
  {
    id: 'eth-sec-approval',
    title: 'Draft Persetujuan ETF ETH Spot Disetujui Staff, Tunggu Penandatanganan',
    source: 'Policy Desk',
    summary: 'Dokumen final dikirim ke komisioner; peluncuran berpotensi live pekan ini jika tak ada keberatan menit akhir.',
    publishedAt: new Date(Date.now() - 2.3 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['ETH'],
    impact: 'high',
  },
  {
    id: 'sol-firedancer',
    title: 'Firedancer Masuk Tahap Shadow-Fork, TPS Stabil di Atas 1M',
    source: 'Validator Watch',
    summary: 'Stress test klien Solana alternatif berjalan mulus, membuka jalan pengurangan outage dan latensi.',
    publishedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['SOL'],
    impact: 'high',
  },
  {
    id: 'arb-stimulus',
    title: 'ARB Meluncurkan Putaran Stimulus Ekosistem $50M untuk DeFi + Gaming',
    source: 'Layer2 Pulse',
    summary: 'Dewan DAO menyetujui hibah multi-fase guna menarik TVL baru pasca penurunan aktivitas.',
    publishedAt: new Date(Date.now() - 4.2 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['ARB', 'ETH'],
    impact: 'medium',
  },
  {
    id: 'btc-miner-capitulation',
    title: 'Hashrate Turun 6%: Sinyal Miner Mulai Jual Cadangan BTC',
    source: 'Hashrate Daily',
    summary: 'Kombinasi cuaca panas dan biaya listrik tinggi memaksa miner kecil melepas treasury untuk tutup biaya.',
    publishedAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['BTC'],
    impact: 'medium',
  },
  {
    id: 'macro-pce-cool',
    title: 'Data PCE AS Mendingin, Odds Rate Cut September Naik ke 64%',
    source: 'MacroBeat',
    summary: 'Inflasi inti turun lebih cepat dari konsensus, dorong dolar melemah dan risk-on pada aset kripto.',
    publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BTC', 'ETH', 'GOLD'],
    impact: 'medium',
  },
  {
    id: 'op-stack-celestia',
    title: 'Rollup OP Stack Adopsi Celestia untuk Data Availability Lebih Murah',
    source: 'Modular Bytes',
    summary: 'Pengembang menargetkan biaya gas L2 turun 30-40% dengan DA alternatif, bisa tekan margin ETH jangka pendek.',
    publishedAt: new Date(Date.now() - 8.5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'neutral',
    assets: ['OP', 'ETH', 'TIA'],
    impact: 'medium',
  },
  {
    id: 'bnb-legal',
    title: 'Tekanan Regulasi BNB di Eropa, Beberapa Pasangan akan Dihapus',
    source: 'RegWatch',
    summary: 'Bursa regional diminta menghentikan listing token privat; BNB dan alt tertentu terancam volume turun.',
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['BNB', 'BTC'],
    impact: 'high',
  },
  {
    id: 'avax-gaming',
    title: 'Studio Game AA Konfirmasi Rilis di Subnet Avalanche Q4',
    source: 'GameFi Insider',
    summary: 'Pengumuman roster baru meningkatkan ekspektasi transaksi on-chain dan royalti validator.',
    publishedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['AVAX'],
    impact: 'medium',
  },
  {
    id: 'defi-hack',
    title: 'Exploit $22M pada Protokol Pinjaman Multichain, TVL Anjlok',
    source: 'DeFi Sec',
    summary: 'Bug oracle cross-chain dimanfaatkan untuk drain vault; likuiditas lari ke bluechip L2.',
    publishedAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ARB', 'OP', 'SOL'],
    impact: 'high',
  },
  {
    id: 'ordinals-burn',
    title: 'Aktivitas Ordinals Turun 40%, Biaya BTC Normal Kembali',
    source: 'Onchain Radar',
    summary: 'Setelah lonjakan minggu lalu, mempool bersih dan biaya rata-rata kembali di bawah 15 sat/vB.',
    publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BTC'],
    impact: 'low',
  },
  {
    id: 'ton-users',
    title: 'Telegram Catat 2 Juta Wallet TON Aktif Harian, TPS Naik 25%',
    source: 'Messenger Wire',
    summary: 'Wallet default mulai dipakai transaksi mikro; staking TVL ikut naik meski biaya relatif stabil.',
    publishedAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['TON'],
    impact: 'high',
  },
  {
    id: 'stablecoin-bill',
    title: 'RUU Stablecoin AS Tambah Pasal Proof-of-Reserves Wajib',
    source: 'US Policy Watch',
    summary: 'Issuer harus audit bulanan dan bank partner tier-1; potensi hambat ekspansi penerbit kecil.',
    publishedAt: new Date(Date.now() - 17.5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'neutral',
    assets: ['USDT', 'USDC', 'BTC'],
    impact: 'medium',
  },
  {
    id: 'ltc-hashrate',
    title: 'Hashrate LTC Pulih 4% Usai Jeda Pemadaman Texas',
    source: 'MinerTalk',
    summary: 'Kapasitas kembali online, tetapi pendapatan miner tetap tertekan oleh harga yang belum pulih.',
    publishedAt: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(),
    sentiment: 'neutral',
    assets: ['LTC', 'BTC'],
    impact: 'low',
  },
  {
    id: 'xrp-ruling',
    title: 'Pengadilan Tolak Banding Kilat SEC di Kasus XRP, Jadwal Tetap',
    source: 'CourtWire',
    summary: 'Pengadilan distrik menolak percepatan; memberi ruang harga XRP memantul dari support mingguan.',
    publishedAt: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['XRP'],
    impact: 'medium',
  },
  {
    id: 'celsius-unlock',
    title: 'Distribusi Token CEL & BTC Bekas Celsius Dimulai, Pasar Waspada Tekanan Jual',
    source: 'Restructuring Daily',
    summary: 'Batch awal pembayaran kreditur mendorong spekulasi arus jual bertahap dalam beberapa minggu.',
    publishedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['CEL', 'BTC', 'ETH'],
    impact: 'medium',
  },
];

export async function getNewsFeed(): Promise<NewsItem[]> {
  return SAMPLE_NEWS.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
