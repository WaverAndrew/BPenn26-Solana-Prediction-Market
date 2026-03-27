import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Pmarket } from "../../target/types/pmarket";

describe("07 - Evidence Mini-Markets", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Pmarket as Program<Pmarket>;

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // Market 1, evidence 0
  const marketIdBytes = Buffer.alloc(8);
  marketIdBytes.writeBigUInt64LE(BigInt("1"));
  const evidenceIdBytes = Buffer.alloc(4);
  evidenceIdBytes.writeUInt32LE(0);

  const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketIdBytes],
    program.programId
  );
  const [evidencePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("evidence"), marketIdBytes, evidenceIdBytes],
    program.programId
  );
  const [evidenceVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("evidence_vault"), marketIdBytes, evidenceIdBytes],
    program.programId
  );

  it("stakes on evidence inclusion", async () => {
    const staker = provider.wallet.publicKey;
    const [stakePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("estake"), marketIdBytes, evidenceIdBytes, staker.toBuffer()],
      program.programId
    );

    // Stake 0.1 SOL on "Included"
    await program.methods
      .stakeEvidence(0, new anchor.BN(100_000_000))
      .accounts({
        staker,
        config: configPda,
        market: marketPda,
        evidence: evidencePda,
        evidenceVault: evidenceVaultPda,
        evidenceStake: stakePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const evidence = await program.account.evidence.fetch(evidencePda);
    expect(evidence.includedPool.toNumber()).to.equal(100_000_000);

    const stake = await program.account.evidenceStake.fetch(stakePda);
    expect(stake.includedAmount.toNumber()).to.equal(100_000_000);
    expect(stake.notIncludedAmount.toNumber()).to.equal(0);
  });

  it("stakes on evidence not-included", async () => {
    const staker = provider.wallet.publicKey;
    const [stakePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("estake"), marketIdBytes, evidenceIdBytes, staker.toBuffer()],
      program.programId
    );

    // Add 0.05 SOL on "Not Included"
    await program.methods
      .stakeEvidence(1, new anchor.BN(50_000_000))
      .accounts({
        staker,
        config: configPda,
        market: marketPda,
        evidence: evidencePda,
        evidenceVault: evidenceVaultPda,
        evidenceStake: stakePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const evidence = await program.account.evidence.fetch(evidencePda);
    expect(evidence.includedPool.toNumber()).to.equal(100_000_000);
    expect(evidence.notIncludedPool.toNumber()).to.equal(50_000_000);

    const stake = await program.account.evidenceStake.fetch(stakePda);
    expect(stake.includedAmount.toNumber()).to.equal(100_000_000);
    expect(stake.notIncludedAmount.toNumber()).to.equal(50_000_000);
  });
});
