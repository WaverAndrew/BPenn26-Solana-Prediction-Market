import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Pmarket } from "../../target/types/pmarket";
import { createHash } from "crypto";

describe("06 - Evidence Flow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Pmarket as Program<Pmarket>;

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // Use market 1 (created in test 05)
  const marketIdBytes = Buffer.alloc(8);
  marketIdBytes.writeBigUInt64LE(BigInt("1"));

  const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketIdBytes],
    program.programId
  );

  it("submits evidence", async () => {
    const evidenceIdBytes = Buffer.alloc(4);
    evidenceIdBytes.writeUInt32LE(0);

    const [evidencePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("evidence"), marketIdBytes, evidenceIdBytes],
      program.programId
    );
    const [evidenceVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("evidence_vault"), marketIdBytes, evidenceIdBytes],
      program.programId
    );

    const contentUri = "ipfs://QmEvidenceContent1";
    const contentHash = Array.from(
      createHash("sha256").update("evidence content 1").digest()
    );
    const bond = new anchor.BN(10_000_000); // 0.01 SOL

    await program.methods
      .submitEvidence(0, contentUri, contentHash, null, bond) // 0 = Yes side
      .accounts({
        author: provider.wallet.publicKey,
        config: configPda,
        market: marketPda,
        evidence: evidencePda,
        evidenceVault: evidenceVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const evidence = await program.account.evidence.fetch(evidencePda);
    expect(evidence.id).to.equal(0);
    expect(evidence.marketId.toNumber()).to.equal(1);
    expect(evidence.contentUri).to.equal(contentUri);
    expect(evidence.bondAmount.toNumber()).to.equal(10_000_000);
    expect(evidence.status).to.deep.equal({ active: {} });
    expect(evidence.side).to.deep.equal({ yes: {} });
    expect(evidence.parentEvidenceId).to.be.null;

    const market = await program.account.market.fetch(marketPda);
    expect(market.evidenceCount).to.equal(1);
  });

  it("submits reply evidence (threaded)", async () => {
    const evidenceIdBytes = Buffer.alloc(4);
    evidenceIdBytes.writeUInt32LE(1);

    const [evidencePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("evidence"), marketIdBytes, evidenceIdBytes],
      program.programId
    );
    const [evidenceVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("evidence_vault"), marketIdBytes, evidenceIdBytes],
      program.programId
    );

    const contentHash = Array.from(
      createHash("sha256").update("reply evidence").digest()
    );

    await program.methods
      .submitEvidence(1, "ipfs://QmReply", contentHash, 0, new anchor.BN(10_000_000))
      .accounts({
        author: provider.wallet.publicKey,
        config: configPda,
        market: marketPda,
        evidence: evidencePda,
        evidenceVault: evidenceVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const evidence = await program.account.evidence.fetch(evidencePda);
    expect(evidence.id).to.equal(1);
    expect(evidence.parentEvidenceId).to.equal(0);
    expect(evidence.side).to.deep.equal({ no: {} });
  });

  it("challenges evidence", async () => {
    const evidenceIdBytes = Buffer.alloc(4);
    evidenceIdBytes.writeUInt32LE(0);

    const [evidencePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("evidence"), marketIdBytes, evidenceIdBytes],
      program.programId
    );

    await program.methods
      .challengeEvidence()
      .accounts({
        challenger: provider.wallet.publicKey,
        config: configPda,
        market: marketPda,
        evidence: evidencePda,
      })
      .rpc();

    const evidence = await program.account.evidence.fetch(evidencePda);
    expect(evidence.challengeCount).to.equal(1);
    expect(evidence.status).to.deep.equal({ active: {} }); // Still active, threshold is 5
  });

  it("rejects bond below minimum", async () => {
    const market = await program.account.market.fetch(marketPda);
    const evidenceIdBytes = Buffer.alloc(4);
    evidenceIdBytes.writeUInt32LE(market.evidenceCount);

    const [evidencePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("evidence"), marketIdBytes, evidenceIdBytes],
      program.programId
    );
    const [evidenceVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("evidence_vault"), marketIdBytes, evidenceIdBytes],
      program.programId
    );

    const contentHash = Array.from(createHash("sha256").update("low bond").digest());

    try {
      await program.methods
        .submitEvidence(0, "ipfs://QmLow", contentHash, null, new anchor.BN(1000))
        .accounts({
          author: provider.wallet.publicKey,
          config: configPda,
          market: marketPda,
          evidence: evidencePda,
          evidenceVault: evidenceVaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("BondTooLow");
    }
  });
});
