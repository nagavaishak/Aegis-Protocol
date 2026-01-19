import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AegisProtocol } from "../target/types/aegis_protocol";
import { expect } from "chai";

describe("aegis_protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AegisProtocol as Program<AegisProtocol>;
  
  // Test data
  const datasetId = Buffer.from("invoice-002".padEnd(32, "\0"));
  const secret = Buffer.from("my-secret-key".padEnd(32, "\0"));
  const secretHash = secret;
  
  const buyerId1 = "BUYER_42";
  const buyerId2 = "BUYER_99";
  const buyerHash1 = Buffer.from(buyerId1.padEnd(32, "\0"));
  const buyerHash2 = Buffer.from(buyerId2.padEnd(32, "\0"));
  
  const minAmount = new anchor.BN(100000);
  const validFrom = Math.floor(Date.now() / 1000) - 60; // Start 60 seconds ago
  const validUntil = validFrom + 86400; // +24 hours

  it("Creates an access rule", async () => {
    const [ruleAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("rule"), datasetId],
      program.programId
    );

    const tx = await program.methods
      .createRule(
        Array.from(datasetId),
        Array.from(secretHash),
        minAmount,
        [Array.from(buyerHash1), Array.from(buyerHash2)],
        new anchor.BN(validFrom),
        new anchor.BN(validUntil)
      )
      .accounts({
        accessRule: ruleAddress,
        owner: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Rule created:", tx);

    // Verify rule
    const rule = await program.account.accessRule.fetch(ruleAddress);
    expect(rule.minAmount.toNumber()).to.equal(100000);
    expect(rule.approvedBuyerHashes.length).to.equal(2);
    expect(rule.isActive).to.be.true;
  });

  it("Grants access with valid credentials", async () => {
    const [ruleAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("rule"), datasetId],
      program.programId
    );

    const [certAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("certificate"),
        ruleAddress.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    const invoiceAmount = new anchor.BN(150000); // Above minimum

    const tx = await program.methods
      .requestAccess(
        Array.from(secret),
        invoiceAmount,
        Array.from(buyerHash1)
      )
      .accounts({
        accessRule: ruleAddress,
        certificate: certAddress,
        requester: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Access granted:", tx);

    // Verify certificate
    const cert = await program.account.accessCertificate.fetch(certAddress);
    expect(cert.isUsed).to.be.false;
    expect(cert.requester.toString()).to.equal(provider.wallet.publicKey.toString());
  });

  it("Denies access with wrong secret", async () => {
    const [ruleAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("rule"), datasetId],
      program.programId
    );

    const wrongSecret = Buffer.from("wrong-secret".padEnd(32, "\0"));
    const invoiceAmount = new anchor.BN(150000);

    // Generate a new certificate address for this failed attempt
    const newRequester = anchor.web3.Keypair.generate();
    const [certAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("certificate"),
        ruleAddress.toBuffer(),
        newRequester.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      // Airdrop SOL to new requester
      const airdropSig = await provider.connection.requestAirdrop(
        newRequester.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      await program.methods
        .requestAccess(
          Array.from(wrongSecret),
          invoiceAmount,
          Array.from(buyerHash1)
        )
        .accounts({
          accessRule: ruleAddress,
          certificate: certAddress,
          requester: newRequester.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([newRequester])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.toString()).to.include("InvalidSecret");
      console.log("✅ Correctly rejected invalid secret");
    }
  });

  it("Denies access with insufficient amount", async () => {
    const [ruleAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("rule"), datasetId],
      program.programId
    );

    const lowAmount = new anchor.BN(50000); // Below minimum

    // Generate a new certificate address for this failed attempt
    const newRequester = anchor.web3.Keypair.generate();
    const [certAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("certificate"),
        ruleAddress.toBuffer(),
        newRequester.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      // Airdrop SOL to new requester
      const airdropSig = await provider.connection.requestAirdrop(
        newRequester.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      await program.methods
        .requestAccess(
          Array.from(secret),
          lowAmount,
          Array.from(buyerHash1)
        )
        .accounts({
          accessRule: ruleAddress,
          certificate: certAddress,
          requester: newRequester.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([newRequester])
        .rpc();
      
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err.toString()).to.include("InsufficientAmount");
      console.log("✅ Correctly rejected insufficient amount");
    }
  });

  it("Uses certificate and records audit", async () => {
    const [ruleAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("rule"), datasetId],
      program.programId
    );

    const [certAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("certificate"),
        ruleAddress.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    const computationResult = true;

    const tx = await program.methods
      .useCertificate(computationResult)
      .accounts({
        certificate: certAddress,
        user: provider.wallet.publicKey,
      })
      .rpc();

    console.log("✅ Certificate used:", tx);

    // Verify certificate is now used
    const cert = await program.account.accessCertificate.fetch(certAddress);
    expect(cert.isUsed).to.be.true;
  });
});
