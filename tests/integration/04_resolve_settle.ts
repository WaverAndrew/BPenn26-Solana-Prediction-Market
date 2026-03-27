import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Pmarket } from "../../target/types/pmarket";

describe("04 - Resolve & Settle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Pmarket as Program<Pmarket>;

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  const [treasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  const marketIdBytes = Buffer.alloc(8);
  marketIdBytes.writeBigUInt64LE(BigInt("0"));

  const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketIdBytes],
    program.programId
  );
  const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketIdBytes],
    program.programId
  );
  const [resolutionPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("resolution"), marketIdBytes],
    program.programId
  );

  it("creates a resolution bundle", async () => {
    await program.methods
      .createResolutionBundle(
        0, // Yes
        [],
        "ipfs://QmRationale"
      )
      .accounts({
        admin: provider.wallet.publicKey,
        config: configPda,
        market: marketPda,
        resolutionBundle: resolutionPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    expect(market.state).to.deep.equal({ resolving: {} });

    const bundle = await program.account.resolutionBundle.fetch(resolutionPda);
    expect(bundle.outcome).to.deep.equal({ yes: {} });
  });

  it("resolves the market", async () => {
    await program.methods
      .resolveMarket()
      .accounts({
        admin: provider.wallet.publicKey,
        config: configPda,
        market: marketPda,
        resolutionBundle: resolutionPda,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    expect(market.state).to.deep.equal({ resolved: {} });
    expect(market.outcome).to.deep.equal({ yes: {} });
  });

  it("settles a winning position", async () => {
    const user = provider.wallet.publicKey;
    const [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketIdBytes, user.toBuffer()],
      program.programId
    );

    const balanceBefore = await provider.connection.getBalance(user);

    await program.methods
      .settlePosition()
      .accounts({
        user,
        config: configPda,
        market: marketPda,
        marketVault: vaultPda,
        treasury: treasuryPda,
        position: positionPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const position = await program.account.position.fetch(positionPda);
    expect(position.claimed).to.equal(true);

    const balanceAfter = await provider.connection.getBalance(user);
    // User had 1 SOL on YES, pool was 1.5 SOL total, YES won
    // Payout = (1.5 - fee) * 1.0 / 1.0 = ~1.4625 SOL (with 2.5% fee)
    expect(balanceAfter).to.be.greaterThan(balanceBefore);
  });

  it("rejects double claim", async () => {
    const user = provider.wallet.publicKey;
    const [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketIdBytes, user.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .settlePosition()
        .accounts({
          user,
          config: configPda,
          market: marketPda,
          marketVault: vaultPda,
          treasury: treasuryPda,
          position: positionPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("AlreadyClaimed");
    }
  });
});
