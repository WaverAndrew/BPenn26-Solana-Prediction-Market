import { PublicKey } from "@solana/web3.js";
import crypto from "crypto";

// -------------------------------------------------------------------
// Anchor discriminators (first 8 bytes = sha256("account:<Name>")[0..8])
// -------------------------------------------------------------------

function accountDiscriminator(name: string): Buffer {
  const hash = crypto.createHash("sha256").update(`account:${name}`).digest();
  return hash.subarray(0, 8);
}

export const DISCRIMINATORS = {
  Config: accountDiscriminator("Config"),
  Market: accountDiscriminator("Market"),
  Evidence: accountDiscriminator("Evidence"),
  Position: accountDiscriminator("Position"),
  EvidenceStake: accountDiscriminator("EvidenceStake"),
  UserProfile: accountDiscriminator("UserProfile"),
  ResolutionBundle: accountDiscriminator("ResolutionBundle"),
} as const;

// -------------------------------------------------------------------
// Buffer reader helper
// -------------------------------------------------------------------

class BorshReader {
  private offset: number;
  private data: Buffer;

  constructor(data: Buffer, offset = 0) {
    this.data = data;
    this.offset = offset;
  }

  readU8(): number {
    const val = this.data.readUInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readU16(): number {
    const val = this.data.readUInt16LE(this.offset);
    this.offset += 2;
    return val;
  }

  readU32(): number {
    const val = this.data.readUInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readI64(): bigint {
    const val = this.data.readBigInt64LE(this.offset);
    this.offset += 8;
    return val;
  }

  readU64(): bigint {
    const val = this.data.readBigUInt64LE(this.offset);
    this.offset += 8;
    return val;
  }

  readBool(): boolean {
    return this.readU8() !== 0;
  }

  readPubkey(): string {
    const bytes = this.data.subarray(this.offset, this.offset + 32);
    this.offset += 32;
    return new PublicKey(bytes).toBase58();
  }

  readString(): string {
    const len = this.readU32();
    const str = this.data.subarray(this.offset, this.offset + len).toString("utf8");
    this.offset += len;
    return str;
  }

  readOption<T>(readInner: () => T): T | null {
    const tag = this.readU8();
    if (tag === 0) return null;
    return readInner();
  }

  readVecU32(): number[] {
    const len = this.readU32();
    const result: number[] = [];
    for (let i = 0; i < len; i++) {
      result.push(this.readU32());
    }
    return result;
  }
}

// -------------------------------------------------------------------
// Parsed types
// -------------------------------------------------------------------

export interface ParsedConfig {
  authority: string;
  treasury: string;
  marketCount: number;
  minBond: bigint;
  protocolFeeBps: number;
}

export interface ParsedMarket {
  id: number;
  creator: string;
  claimUri: string;
  category: string;
  expiry: bigint;
  state: number;
  outcome: number;
  yesPool: bigint;
  noPool: bigint;
  evidenceCount: number;
  resolutionBundle: number;
  metadataUri: string;
  createdAt: bigint;
}

export interface ParsedEvidence {
  id: number;
  marketId: number;
  parentEvidenceId: number | null;
  author: string;
  side: number;
  contentUri: string;
  contentHash: string;
  bondAmount: bigint;
  includedPool: bigint;
  notIncludedPool: bigint;
  supportCount: number;
  challengeCount: number;
  status: number;
  createdAt: bigint;
}

export interface ParsedPosition {
  marketId: number;
  user: string;
  yesAmount: bigint;
  noAmount: bigint;
  claimed: boolean;
}

export interface ParsedEvidenceStake {
  marketId: number;
  evidenceId: number;
  user: string;
  includedAmount: bigint;
  notIncludedAmount: bigint;
  claimed: boolean;
}

export interface ParsedUserProfile {
  authority: string;
  forecastKarma: bigint;
  evidenceKarma: bigint;
  reviewerKarma: bigint;
  challengeKarma: bigint;
  penalties: number;
  marketsCreated: number;
  betsPlaced: number;
  evidenceSubmitted: number;
  createdAt: bigint;
}

export interface ParsedResolutionBundle {
  marketId: number;
  outcome: number;
  includedEvidenceIds: number[];
  resolver: string;
  rationaleUri: string;
  resolvedAt: bigint;
  disputed: boolean;
}

// -------------------------------------------------------------------
// Parser functions (skip 8-byte discriminator)
// -------------------------------------------------------------------

export function parseConfig(data: Buffer): ParsedConfig {
  const r = new BorshReader(data, 8);
  return {
    authority: r.readPubkey(),
    treasury: r.readPubkey(),
    marketCount: r.readU32(),
    minBond: r.readU64(),
    protocolFeeBps: r.readU16(),
  };
}

export function parseMarket(data: Buffer): ParsedMarket {
  const r = new BorshReader(data, 8);
  return {
    id: r.readU32(),
    creator: r.readPubkey(),
    claimUri: r.readString(),
    category: r.readString(),
    expiry: r.readI64(),
    state: r.readU8(),
    outcome: r.readU8(),
    yesPool: r.readU64(),
    noPool: r.readU64(),
    evidenceCount: r.readU32(),
    resolutionBundle: r.readU32(),
    metadataUri: r.readString(),
    createdAt: r.readI64(),
  };
}

export function parseEvidence(data: Buffer): ParsedEvidence {
  const r = new BorshReader(data, 8);
  const id = r.readU32();
  const marketId = r.readU32();
  const parentEvidenceId = r.readOption(() => r.readU32());
  return {
    id,
    marketId,
    parentEvidenceId,
    author: r.readPubkey(),
    side: r.readU8(),
    contentUri: r.readString(),
    contentHash: r.readString(),
    bondAmount: r.readU64(),
    includedPool: r.readU64(),
    notIncludedPool: r.readU64(),
    supportCount: r.readU32(),
    challengeCount: r.readU32(),
    status: r.readU8(),
    createdAt: r.readI64(),
  };
}

export function parsePosition(data: Buffer): ParsedPosition {
  const r = new BorshReader(data, 8);
  return {
    marketId: r.readU32(),
    user: r.readPubkey(),
    yesAmount: r.readU64(),
    noAmount: r.readU64(),
    claimed: r.readBool(),
  };
}

export function parseEvidenceStake(data: Buffer): ParsedEvidenceStake {
  const r = new BorshReader(data, 8);
  return {
    marketId: r.readU32(),
    evidenceId: r.readU32(),
    user: r.readPubkey(),
    includedAmount: r.readU64(),
    notIncludedAmount: r.readU64(),
    claimed: r.readBool(),
  };
}

export function parseUserProfile(data: Buffer): ParsedUserProfile {
  const r = new BorshReader(data, 8);
  return {
    authority: r.readPubkey(),
    forecastKarma: r.readI64(),
    evidenceKarma: r.readI64(),
    reviewerKarma: r.readI64(),
    challengeKarma: r.readI64(),
    penalties: r.readU32(),
    marketsCreated: r.readU32(),
    betsPlaced: r.readU32(),
    evidenceSubmitted: r.readU32(),
    createdAt: r.readI64(),
  };
}

export function parseResolutionBundle(data: Buffer): ParsedResolutionBundle {
  const r = new BorshReader(data, 8);
  return {
    marketId: r.readU32(),
    outcome: r.readU8(),
    includedEvidenceIds: r.readVecU32(),
    resolver: r.readPubkey(),
    rationaleUri: r.readString(),
    resolvedAt: r.readI64(),
    disputed: r.readBool(),
  };
}
