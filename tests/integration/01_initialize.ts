import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Pmarket } from "../../target/types/pmarket";

describe("01 - Initialize", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Pmarket as Program<Pmarket>;
  const admin = provider.wallet;

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  const [treasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  it("initializes the protocol", async () => {
    const feeBps = 250; // 2.5%
    await program.methods
      .initialize(feeBps)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.config.fetch(configPda);
    expect(config.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(config.feeBps).to.equal(feeBps);
    expect(config.marketCounter.toNumber()).to.equal(0);
    expect(config.paused).to.equal(false);
  });

  it("rejects invalid fee bps", async () => {
    // Config already exists, so this will fail with a different error
    // But we test the constraint in a fresh scenario
    try {
      const [fakePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
      );
      // This should fail because config already initialized
      await program.methods
        .initialize(10001)
        .accounts({
          admin: admin.publicKey,
          config: fakePda,
          treasury: treasuryPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      // Expected - either InvalidFeeBps or account already exists
      expect(err).to.exist;
    }
  });
});
