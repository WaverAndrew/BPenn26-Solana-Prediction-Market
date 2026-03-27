import { PrismaClient } from "@prisma/client";
import type {
  ParsedMarket,
  ParsedEvidence,
  ParsedPosition,
  ParsedEvidenceStake,
  ParsedUserProfile,
  ParsedResolutionBundle,
} from "./parsers";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function unixToDate(ts: bigint): Date {
  return new Date(Number(ts) * 1000);
}

// -------------------------------------------------------------------
// Upsert functions
// -------------------------------------------------------------------

export async function upsertMarket(m: ParsedMarket): Promise<void> {
  await prisma.market.upsert({
    where: { id: m.id },
    update: {
      creator: m.creator,
      claimUri: m.claimUri,
      category: m.category,
      expiry: unixToDate(m.expiry),
      state: m.state,
      outcome: m.outcome,
      yesPool: m.yesPool,
      noPool: m.noPool,
      evidenceCount: m.evidenceCount,
      resolutionBundle: m.resolutionBundle,
      metadataUri: m.metadataUri,
      createdAt: unixToDate(m.createdAt),
    },
    create: {
      id: m.id,
      creator: m.creator,
      claimUri: m.claimUri,
      category: m.category,
      expiry: unixToDate(m.expiry),
      state: m.state,
      outcome: m.outcome,
      yesPool: m.yesPool,
      noPool: m.noPool,
      evidenceCount: m.evidenceCount,
      resolutionBundle: m.resolutionBundle,
      metadataUri: m.metadataUri,
      createdAt: unixToDate(m.createdAt),
    },
  });
}

export async function upsertEvidence(e: ParsedEvidence): Promise<void> {
  await prisma.evidence.upsert({
    where: {
      marketId_id: { marketId: e.marketId, id: e.id },
    },
    update: {
      parentEvidenceId: e.parentEvidenceId,
      author: e.author,
      side: e.side,
      contentUri: e.contentUri,
      contentHash: e.contentHash,
      bondAmount: e.bondAmount,
      includedPool: e.includedPool,
      notIncludedPool: e.notIncludedPool,
      supportCount: e.supportCount,
      challengeCount: e.challengeCount,
      status: e.status,
      createdAt: unixToDate(e.createdAt),
    },
    create: {
      id: e.id,
      marketId: e.marketId,
      parentEvidenceId: e.parentEvidenceId,
      author: e.author,
      side: e.side,
      contentUri: e.contentUri,
      contentHash: e.contentHash,
      bondAmount: e.bondAmount,
      includedPool: e.includedPool,
      notIncludedPool: e.notIncludedPool,
      supportCount: e.supportCount,
      challengeCount: e.challengeCount,
      status: e.status,
      createdAt: unixToDate(e.createdAt),
    },
  });
}

export async function upsertPosition(p: ParsedPosition): Promise<void> {
  await prisma.position.upsert({
    where: {
      marketId_user: { marketId: p.marketId, user: p.user },
    },
    update: {
      yesAmount: p.yesAmount,
      noAmount: p.noAmount,
      claimed: p.claimed,
    },
    create: {
      marketId: p.marketId,
      user: p.user,
      yesAmount: p.yesAmount,
      noAmount: p.noAmount,
      claimed: p.claimed,
    },
  });
}

export async function upsertEvidenceStake(s: ParsedEvidenceStake): Promise<void> {
  await prisma.evidenceStake.upsert({
    where: {
      marketId_evidenceId_user: {
        marketId: s.marketId,
        evidenceId: s.evidenceId,
        user: s.user,
      },
    },
    update: {
      includedAmount: s.includedAmount,
      notIncludedAmount: s.notIncludedAmount,
      claimed: s.claimed,
    },
    create: {
      marketId: s.marketId,
      evidenceId: s.evidenceId,
      user: s.user,
      includedAmount: s.includedAmount,
      notIncludedAmount: s.notIncludedAmount,
      claimed: s.claimed,
    },
  });
}

export async function upsertUserProfile(u: ParsedUserProfile): Promise<void> {
  await prisma.userProfile.upsert({
    where: { authority: u.authority },
    update: {
      forecastKarma: u.forecastKarma,
      evidenceKarma: u.evidenceKarma,
      reviewerKarma: u.reviewerKarma,
      challengeKarma: u.challengeKarma,
      penalties: u.penalties,
      marketsCreated: u.marketsCreated,
      betsPlaced: u.betsPlaced,
      evidenceSubmitted: u.evidenceSubmitted,
      createdAt: unixToDate(u.createdAt),
    },
    create: {
      authority: u.authority,
      forecastKarma: u.forecastKarma,
      evidenceKarma: u.evidenceKarma,
      reviewerKarma: u.reviewerKarma,
      challengeKarma: u.challengeKarma,
      penalties: u.penalties,
      marketsCreated: u.marketsCreated,
      betsPlaced: u.betsPlaced,
      evidenceSubmitted: u.evidenceSubmitted,
      createdAt: unixToDate(u.createdAt),
    },
  });
}

export async function upsertResolutionBundle(rb: ParsedResolutionBundle): Promise<void> {
  await prisma.resolutionBundle.upsert({
    where: { marketId: rb.marketId },
    update: {
      outcome: rb.outcome,
      includedEvidenceIds: rb.includedEvidenceIds,
      resolver: rb.resolver,
      rationaleUri: rb.rationaleUri,
      resolvedAt: unixToDate(rb.resolvedAt),
      disputed: rb.disputed,
    },
    create: {
      marketId: rb.marketId,
      outcome: rb.outcome,
      includedEvidenceIds: rb.includedEvidenceIds,
      resolver: rb.resolver,
      rationaleUri: rb.rationaleUri,
      resolvedAt: unixToDate(rb.resolvedAt),
      disputed: rb.disputed,
    },
  });
}
