import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Pmarket } from "../../target/types/pmarket";

describe("02 - Create Market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Pmarket as Program<Pmarket>;

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  it("creates a market", async () => {
    const config = await program.account.config.fetch(configPda);
    const marketId = config.marketCounter;
    const marketIdBytes = Buffer.alloc(8);
    marketIdBytes.writeBigUInt64LE(BigInt(marketId.toString()));

    const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketIdBytes],
      program.programId
    );
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketIdBytes],
      program.programId
    );

    const claimUri = "ipfs://QmExampleClaim12345";
    const category = 0; // politics
    const expiry = new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 7); // 7 days
    const metadataUri = "ipfs://QmExampleMeta";

    await program.methods
      .createMarket(claimUri, category, expiry, metadataUri)
      .accounts({
        creator: provider.wallet.publicKey,
        config: configPda,
        market: marketPda,
        marketVault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    expect(market.id.toNumber()).to.equal(0);
    expect(market.claimUri).to.equal(claimUri);
    expect(market.category).to.equal(category);
    expect(market.yesPool.toNumber()).to.equal(0);
    expect(market.noPool.toNumber()).to.equal(0);
    expect(market.evidenceCount).to.equal(0);
    expect(market.state).to.deep.equal({ open: {} });
    expect(market.outcome).to.deep.equal({ undecided: {} });

    // Verify counter incremented
    const updatedConfig = await program.account.config.fetch(configPda);
    expect(updatedConfig.marketCounter.toNumber()).to.equal(1);
  });

  it("rejects market with past expiry", async () => {
    const config = await program.account.config.fetch(configPda);
    const marketId = config.marketCounter;
    const marketIdBytes = Buffer.alloc(8);
    marketIdBytes.writeBigUInt64LE(BigInt(marketId.toString()));

    const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketIdBytes],
      program.programId
    );
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketIdBytes],
      program.programId
    );

    try {
      await program.methods
        .createMarket("ipfs://test", 0, new anchor.BN(1000), "ipfs://meta")
        .accounts({
          creator: provider.wallet.publicKey,
          config: configPda,
          market: marketPda,
          marketVault: vaultPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("ExpiryInPast");
    }
  });
});
