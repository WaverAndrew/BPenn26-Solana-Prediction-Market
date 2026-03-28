import { MarketData, EvidenceData } from "./api";

const WALLET_A = "7FCBHP8HBF8vjYpHo4Ch2irS2M7sFpoYKFovnKZQtyqU";
const WALLET_B = "GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW";
const WALLET_C = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const WALLET_D = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

export const DEMO_MARKETS: MarketData[] = [
  {
    id: 10,
    creator: WALLET_A,
    claimUri: "Will GPT-5 pass a blind Turing test conducted by a major university?",
    claimText: "Will GPT-5 pass a blind Turing test conducted by a major university?",
    category: 4,
    expiry: Date.now() / 1000 + 86400 * 120,
    state: "Open",
    outcome: "Undecided",
    yesPool: 150_000_000,
    noPool: 100_000_000,
    evidenceCount: 2,
    metadataUri: "ipfs://QmGPT5",
    createdAt: Date.now() / 1000 - 3600,
  },
  {
    id: 1001,
    creator: WALLET_B,
    claimUri: "Will Bitcoin break $200k by December 2025?",
    claimText: "Will Bitcoin break $200k by December 2025?",
    category: 2,
    expiry: Date.now() / 1000 + 86400 * 30,
    state: "Open",
    outcome: "Undecided",
    yesPool: 45_200_000_000,
    noPool: 30_800_000_000,
    evidenceCount: 6,
    metadataUri: "",
    createdAt: Date.now() / 1000 - 86400 * 3,
  },
  {
    id: 1002,
    creator: WALLET_C,
    claimUri: "Will the US economy enter a recession before end of 2025?",
    claimText: "Will the US economy enter a recession before end of 2025?",
    category: 0,
    expiry: Date.now() / 1000 + 86400 * 60,
    state: "Open",
    outcome: "Undecided",
    yesPool: 18_500_000_000,
    noPool: 52_300_000_000,
    evidenceCount: 5,
    metadataUri: "",
    createdAt: Date.now() / 1000 - 86400 * 7,
  },
  {
    id: 1003,
    creator: WALLET_D,
    claimUri: "Will Solana flip Ethereum by market cap in 2025?",
    claimText: "Will Solana flip Ethereum by market cap in 2025?",
    category: 2,
    expiry: Date.now() / 1000 + 86400 * 90,
    state: "Open",
    outcome: "Undecided",
    yesPool: 88_000_000_000,
    noPool: 42_000_000_000,
    evidenceCount: 4,
    metadataUri: "",
    createdAt: Date.now() / 1000 - 3600 * 12,
  },
  {
    id: 1004,
    creator: WALLET_A,
    claimUri: "Will the 2026 FIFA World Cup be held without a major security incident?",
    claimText: "Will the 2026 FIFA World Cup be held without a major security incident?",
    category: 1,
    expiry: Date.now() / 1000 + 86400 * 400,
    state: "Open",
    outcome: "Undecided",
    yesPool: 67_000_000_000,
    noPool: 14_000_000_000,
    evidenceCount: 3,
    metadataUri: "",
    createdAt: Date.now() / 1000 - 7200,
  },
];

/** Evidence — only market 10 has real on-chain data. Others are display-only. */
export const DEMO_EVIDENCE: Record<number, EvidenceData[]> = {
  10: [
    {
      id: 0, marketId: 10, parentEvidenceId: null, author: WALLET_A, side: "Yes",
      contentUri: "GPT-4 already fools ~50% of judges in informal tests. GPT-5 will cross the formal threshold.",
      contentText: "GPT-4 already fools ~50% of judges in informal tests. GPT-5 will cross the formal threshold.",
      bondAmount: 50_000_000, includedPool: 30_000_000, notIncludedPool: 0,
      supportCount: 1, challengeCount: 0, status: "Active", createdAt: Date.now() / 1000 - 1800,
    },
    {
      id: 1, marketId: 10, parentEvidenceId: 0, author: WALLET_A, side: "No",
      contentUri: "Formal Turing tests use expert interrogators trained to detect AI. GPT-4 consistently fails against experts.",
      contentText: "Formal Turing tests use expert interrogators trained to detect AI. GPT-4 consistently fails against experts.",
      bondAmount: 40_000_000, includedPool: 0, notIncludedPool: 0,
      supportCount: 0, challengeCount: 0, status: "Active", createdAt: Date.now() / 1000 - 900,
    },
  ],
  1001: [
    {
      id: 0, marketId: 1001, parentEvidenceId: null, author: WALLET_B, side: "Yes",
      contentText: "BlackRock IBIT crossed $18B AUM in 6 months — structural institutional demand at scale never seen before.",
      contentUri: "", bondAmount: 50_000_000, includedPool: 12_000_000_000, notIncludedPool: 4_000_000_000,
      supportCount: 18, challengeCount: 3, status: "Active", createdAt: Date.now() / 1000 - 86400 * 2,
    },
    {
      id: 1, marketId: 1001, parentEvidenceId: 0, author: WALLET_C, side: "No",
      contentText: "ETF flows are mostly basis-trade arbitrage, not directional longs. Real demand is overstated.",
      contentUri: "", bondAmount: 30_000_000, includedPool: 7_000_000_000, notIncludedPool: 9_000_000_000,
      supportCount: 9, challengeCount: 7, status: "Challenged", createdAt: Date.now() / 1000 - 86400,
    },
    {
      id: 2, marketId: 1001, parentEvidenceId: null, author: WALLET_D, side: "No",
      contentText: "Every previous Bitcoin halving cycle topped out within 18 months. The peak was likely already in around $108k.",
      contentUri: "", bondAmount: 60_000_000, includedPool: 5_000_000_000, notIncludedPool: 11_000_000_000,
      supportCount: 11, challengeCount: 12, status: "Challenged", createdAt: Date.now() / 1000 - 86400 * 1.5,
    },
  ],
  1002: [
    {
      id: 0, marketId: 1002, parentEvidenceId: null, author: WALLET_C, side: "Yes",
      contentText: "Yield curve inverted for 22 consecutive months — longest in US history. Every such inversion preceded recession.",
      contentUri: "", bondAmount: 80_000_000, includedPool: 8_000_000_000, notIncludedPool: 15_000_000_000,
      supportCount: 22, challengeCount: 14, status: "Challenged", createdAt: Date.now() / 1000 - 86400 * 5,
    },
    {
      id: 1, marketId: 1002, parentEvidenceId: 0, author: WALLET_A, side: "No",
      contentText: "The yield curve has since un-inverted. Re-steepening actually signals recession risk is OVER.",
      contentUri: "", bondAmount: 50_000_000, includedPool: 12_000_000_000, notIncludedPool: 5_000_000_000,
      supportCount: 19, challengeCount: 6, status: "Active", createdAt: Date.now() / 1000 - 86400 * 4,
    },
  ],
  1003: [
    {
      id: 0, marketId: 1003, parentEvidenceId: null, author: WALLET_A, side: "Yes",
      contentText: "Solana processes 65,000 TPS vs Ethereum's 30 TPS. Technical fundamentals favor SOL as dApps scale.",
      contentUri: "", bondAmount: 60_000_000, includedPool: 18_000_000_000, notIncludedPool: 6_000_000_000,
      supportCount: 28, challengeCount: 7, status: "Active", createdAt: Date.now() / 1000 - 3600 * 10,
    },
    {
      id: 1, marketId: 1003, parentEvidenceId: 0, author: WALLET_B, side: "No",
      contentText: "ETH L2s (Base, Arbitrum, Optimism) collectively process 200k+ TPS. Compare Solana to the L2 ecosystem.",
      contentUri: "", bondAmount: 45_000_000, includedPool: 9_000_000_000, notIncludedPool: 13_000_000_000,
      supportCount: 15, challengeCount: 17, status: "Challenged", createdAt: Date.now() / 1000 - 3600 * 8,
    },
  ],
  1004: [
    {
      id: 0, marketId: 1004, parentEvidenceId: null, author: WALLET_B, side: "Yes",
      contentText: "FIFA 2026 spans US, Canada, and Mexico — three politically stable NATO members with world-class security.",
      contentUri: "", bondAmount: 40_000_000, includedPool: 22_000_000_000, notIncludedPool: 3_000_000_000,
      supportCount: 30, challengeCount: 2, status: "Active", createdAt: Date.now() / 1000 - 5400,
    },
    {
      id: 1, marketId: 1004, parentEvidenceId: 0, author: WALLET_D, side: "No",
      contentText: "The 1996 Atlanta Olympics bombing shows even the most security-rich events are vulnerable.",
      contentUri: "", bondAmount: 30_000_000, includedPool: 4_000_000_000, notIncludedPool: 8_000_000_000,
      supportCount: 8, challengeCount: 15, status: "Active", createdAt: Date.now() / 1000 - 3600,
    },
  ],
};
