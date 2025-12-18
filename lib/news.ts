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
    title: 'Asia Pacific Bitcoin ETF Approval Triggers New Capital Flows',
    source: 'CryptoAsia',
    summary:
      'Asia-Pacific regulators approved a spot Bitcoin ETF, immediately sparking a jump in institutional demand.',
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BTC', 'ETH'],
    impact: 'high',
  },
  {
    id: 'sol-partnership',
    title: 'Solana Announces Major Partnership with Payments Giant',
    source: 'PayStream',
    summary: 'Cross-chain payments integration is expected to bring mainstream merchants on-chain to the Solana ecosystem.',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['SOL'],
    impact: 'high',
  },
  {
    id: 'layerzero-airdrop',
    title: 'LayerZero Airdrop Rumors Push Bridge Activity',
    source: 'Airdrop Hunter',
    summary: 'Speculation around points and the latest snapshot is fueling a surge in cross-chain bridging.',
    publishedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['ZRO', 'ETH', 'ARB'],
    impact: 'medium',
  },
  {
    id: 'eth-dencun',
    title: 'Dencun Upgrade Cuts L2 Fees by Up to 60%',
    source: 'L2 Monitor',
    summary: 'Early data shows rollup transaction costs dropping significantly after the Dencun upgrade.',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['ETH', 'OP', 'ARB'],
    impact: 'high',
  },
  {
    id: 'ltc-halving',
    title: 'Litecoin Nears Halving as Hashrate Hits a New Peak',
    source: 'MinerTalk',
    summary: 'Miners are increasing capacity ahead of the halving, fueling speculation about reduced supply.',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['LTC', 'BTC'],
    impact: 'medium',
  },
  {
    id: 'regulation-us',
    title: 'US Stablecoin Bill Enters Congress',
    source: 'US Policy Watch',
    summary: 'The proposed stablecoin bill could delay new token issuance until special approvals are granted.',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    sentiment: 'neutral',
    assets: ['USDT', 'USDC', 'BTC'],
    impact: 'medium',
  },
  {
    id: 'eth-etf-delay',
    title: 'US Regulators Delay Ethereum ETF Decision',
    source: 'CoinDesk',
    summary: 'The SEC requested another comment period, pushing the ETH spot ETF launch back.',
    publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ETH'],
    impact: 'medium',
  },
  {
    id: 'bnb-burn',
    title: 'Next BNB Burn Reported to Be More Aggressive',
    source: 'ChainPulse',
    summary: 'Binance representatives hint that the quarterly burn rate will increase alongside the transaction surge.',
    publishedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BNB'],
    impact: 'medium',
  },
  {
    id: 'avalanche-games',
    title: 'Avalanche Gaming Ecosystem Receives New Funding',
    source: 'GameFi Insider',
    summary: 'A $50M developer fund launched to attract AAA studios to Avalanche.',
    publishedAt: new Date(Date.now() - 8.5 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['AVAX'],
    impact: 'medium',
  },
  {
    id: 'hack-debridge',
    title: 'DeFi Bridge Exploit Pressures Altcoin Confidence',
    source: 'DefiSec',
    summary: 'A recent attack on a cross-chain bridge triggered liquidity outflows.',
    publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ARB', 'OP', 'SOL'],
    impact: 'high',
  },
  {
    id: 'sec-lawsuit',
    title: 'SEC Adds More Tokens to New Lawsuit',
    source: 'RegWatch',
    summary: 'The US regulator listed several mid-cap tokens as securities, pressuring altcoin sentiment.',
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ADA', 'MATIC', 'SOL'],
    impact: 'high',
  },
  {
    id: 'macro-cpi',
    title: 'US CPI Falls, Rate-Cut Odds Increase',
    source: 'MacroBeat',
    summary: 'Lower-than-expected inflation opens the door for faster rate cuts.',
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['BTC', 'ETH', 'GOLD'],
    impact: 'medium',
  },
  {
    id: 'mining-cost',
    title: 'Electricity Costs Rise, Small Miners Start Shutting Down',
    source: 'Hashrate Daily',
    summary: 'Higher energy costs in several regions force smaller miners to sell BTC reserves.',
    publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['BTC'],
    impact: 'medium',
  },
  {
    id: 'ton-messenger',
    title: 'Telegram Announces Default TON Wallet Integration',
    source: 'Messenger Wire',
    summary: 'Enabling the built-in wallet for millions of users triggers a surge of new addresses on the TON network.',
    publishedAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bullish',
    assets: ['TON'],
    impact: 'high',
  },
  {
    id: 'defi-tvlslide',
    title: 'DeFi TVL Drops 8% in a Week',
    source: 'DeFi Pulse',
    summary: 'Altcoin price drops and profit-taking are squeezing total value locked across chains.',
    publishedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    sentiment: 'bearish',
    assets: ['ETH', 'AVAX', 'SOL'],
    impact: 'medium',
  },
  {
    id: 'ordo-btc',
    title: 'Ordinal Volume Climbs, BTC Fees Jump',
    source: 'Onchain Radar',
    summary: 'A spike in inscriptions is crowding the mempool again and delaying confirmations for small transactions.',
    publishedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    sentiment: 'neutral',
    assets: ['BTC'],
    impact: 'low',
  },
];

export async function getNewsFeed(): Promise<NewsItem[]> {
  return SAMPLE_NEWS.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
