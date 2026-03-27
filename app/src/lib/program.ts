import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";

export const PROGRAM_ID = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8899";

// Minimal IDL for the instructions we need on the client.
// In production, import the full generated IDL from target/idl/pmarket.json
const IDL: Idl = {
  version: "0.1.0",
  name: "pmarket",
  instructions: [
    {
      name: "createMarket",
      accounts: [
        { name: "creator", isMut: true, isSigner: true },
        { name: "config", isMut: true, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "marketVault", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "claimUri", type: "string" },
        { name: "category", type: "u8" },
        { name: "expiry", type: "i64" },
        { name: "metadataUri", type: "string" },
      ],
    },
    {
      name: "placeBet",
      accounts: [
        { name: "bettor", isMut: true, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "marketVault", isMut: true, isSigner: false },
        { name: "position", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "outcome", type: "u8" },
        { name: "amount", type: "u64" },
      ],
    },
    {
      name: "submitEvidence",
      accounts: [
        { name: "author", isMut: true, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "evidence", isMut: true, isSigner: false },
        { name: "evidenceVault", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "side", type: "u8" },
        { name: "contentUri", type: "string" },
        { name: "contentHash", type: { array: ["u8", 32] } },
        { name: "parentId", type: { option: "u32" } },
        { name: "bond", type: "u64" },
      ],
    },
    {
      name: "stakeEvidence",
      accounts: [
        { name: "staker", isMut: true, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "market", isMut: false, isSigner: false },
        { name: "evidence", isMut: true, isSigner: false },
        { name: "evidenceVault", isMut: true, isSigner: false },
        { name: "evidenceStake", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "side", type: "u8" },
        { name: "amount", type: "u64" },
      ],
    },
    {
      name: "createResolutionBundle",
      accounts: [
        { name: "admin", isMut: true, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "resolutionBundle", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "outcome", type: "u8" },
        { name: "includedIds", type: { vec: "u32" } },
        { name: "rationaleUri", type: "string" },
      ],
    },
    {
      name: "resolveMarket",
      accounts: [
        { name: "admin", isMut: true, isSigner: true },
        { name: "config", isMut: false, isSigner: false },
        { name: "market", isMut: true, isSigner: false },
        { name: "resolutionBundle", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [],
};

export function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

export function getProvider(wallet: AnchorWallet): AnchorProvider {
  const connection = getConnection();
  return new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
}

export function getProgram(wallet: AnchorWallet): Program {
  const provider = getProvider(wallet);
  return new Program(IDL, PROGRAM_ID, provider);
}
