import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Pmarket } from "../../target/types/pmarket";

describe("05 - Edge Cases", () => {
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

  it("rejects bet on resolved market", async () => {
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
    const bettor = provider.wallet.publicKey;
    const [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketIdBytes, bettor.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .placeBet(0, new anchor.BN(100_000_000))
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
      expect(err.error.errorCode.code).to.equal("InvalidMarketState");
    }
  });

  it("rejects non-admin resolution", async () => {
    // Create a new market first
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

    const expiry = new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 7);
    await program.methods
      .createMarket("ipfs://test2", 0, expiry, "ipfs://meta2")
      .accounts({
        creator: provider.wallet.publicKey,
        config: configPda,
        market: marketPda,
        marketVault: vaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Try to resolve with a non-admin keypair
    const nonAdmin = anchor.web3.Keypair.generate();
    const airdropSig = await provider.connection.requestAirdrop(
      nonAdmin.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(airdropSig);

    const [resolutionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("resolution"), marketIdBytes],
      program.programId
    );

    try {
      await program.methods
        .createResolutionBundle(0, [], "ipfs://fake")
        .accounts({
          admin: nonAdmin.publicKey,
          config: configPda,
          market: marketPda,
          resolutionBundle: resolutionPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([nonAdmin])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("Unauthorized");
    }
  });
});
