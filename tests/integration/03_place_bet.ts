import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Pmarket } from "../../target/types/pmarket";

describe("03 - Place Bet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Pmarket as Program<Pmarket>;

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // Market 0 was created in test 02
  const marketId = new anchor.BN(0);
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

  it("places a YES bet", async () => {
    const bettor = provider.wallet.publicKey;
    const [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketIdBytes, bettor.toBuffer()],
      program.programId
    );

    const amount = new anchor.BN(1_000_000_000); // 1 SOL

    await program.methods
      .placeBet(0, amount) // 0 = Yes
      .accounts({
        bettor,
        config: configPda,
        market: marketPda,
        marketVault: vaultPda,
        position: positionPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    expect(market.yesPool.toNumber()).to.equal(1_000_000_000);
    expect(market.noPool.toNumber()).to.equal(0);

    const position = await program.account.position.fetch(positionPda);
    expect(position.yesAmount.toNumber()).to.equal(1_000_000_000);
    expect(position.noAmount.toNumber()).to.equal(0);
    expect(position.claimed).to.equal(false);
  });

  it("places a NO bet", async () => {
    const bettor = provider.wallet.publicKey;
    const [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketIdBytes, bettor.toBuffer()],
      program.programId
    );

    const amount = new anchor.BN(500_000_000); // 0.5 SOL

    await program.methods
      .placeBet(1, amount) // 1 = No
      .accounts({
        bettor,
        config: configPda,
        market: marketPda,
        marketVault: vaultPda,
        position: positionPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    expect(market.yesPool.toNumber()).to.equal(1_000_000_000);
    expect(market.noPool.toNumber()).to.equal(500_000_000);

    const position = await program.account.position.fetch(positionPda);
    expect(position.yesAmount.toNumber()).to.equal(1_000_000_000);
    expect(position.noAmount.toNumber()).to.equal(500_000_000);
  });

  it("rejects zero amount bet", async () => {
    const bettor = provider.wallet.publicKey;
    const [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketIdBytes, bettor.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .placeBet(0, new anchor.BN(0))
        .accounts({
          bettor,
          config: configPda,
          market: marketPda,
          marketVault: vaultPda,
          position: positionPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("ZeroAmount");
    }
  });
});
