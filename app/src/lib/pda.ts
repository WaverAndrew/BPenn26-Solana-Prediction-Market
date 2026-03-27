import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./program";
import { Buffer } from "buffer";

function u64ToLeBytes(n: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

function u32ToLeBytes(n: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n);
  return buf;
}

export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

export function getMarketPda(marketId: number | bigint): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), u64ToLeBytes(marketId)],
    PROGRAM_ID
  );
}

export function getVaultPda(marketId: number | bigint): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), u64ToLeBytes(marketId)],
    PROGRAM_ID
  );
}

export function getPositionPda(
  marketId: number | bigint,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), u64ToLeBytes(marketId), user.toBuffer()],
    PROGRAM_ID
  );
}

export function getEvidencePda(
  marketId: number | bigint,
  evidenceId: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("evidence"),
      u64ToLeBytes(marketId),
      u32ToLeBytes(evidenceId),
    ],
    PROGRAM_ID
  );
}

export function getEvidenceVaultPda(
  marketId: number | bigint,
  evidenceId: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("evidence_vault"),
      u64ToLeBytes(marketId),
      u32ToLeBytes(evidenceId),
    ],
    PROGRAM_ID
  );
}

export function getEvidenceStakePda(
  marketId: number | bigint,
  evidenceId: number,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("estake"),
      u64ToLeBytes(marketId),
      u32ToLeBytes(evidenceId),
      user.toBuffer(),
    ],
    PROGRAM_ID
  );
}

export function getProfilePda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), user.toBuffer()],
    PROGRAM_ID
  );
}

export function getResolutionPda(
  marketId: number | bigint
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("resolution"), u64ToLeBytes(marketId)],
    PROGRAM_ID
  );
}

export function getTreasuryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    PROGRAM_ID
  );
}
