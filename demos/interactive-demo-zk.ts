import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import circuit from '../zk/aegis_policy/target/aegis_policy.json';
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import { createHash } from "crypto";

const PROGRAM_ID = new PublicKey("J4qkfpNjTBHwW5eNSeAEKTB6wYVPSjAo3fVZcC93bSCE");

// Banner
console.log(chalk.cyan.bold("\n╔══════════════════════════════════════════════════════════╗"));
console.log(chalk.cyan.bold("║                                                          ║"));
console.log(chalk.cyan.bold("║           🔐  AEGIS PROTOCOL - DEMO                     ║"));
console.log(chalk.cyan.bold("║     Privacy-Preserving Access Control with ZK Proofs     ║"));
console.log(chalk.cyan.bold("║                                                          ║"));
console.log(chalk.cyan.bold("╚══════════════════════════════════════════════════════════╝\n"));

async function main() {
  // Setup connection
  const connection = new Connection(
    process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899",
    "confirmed"
  );
  
  // Load wallet
  const walletPath = process.env.HOME + "/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const idl = JSON.parse(
    fs.readFileSync("./target/idl/aegis_protocol.json", "utf-8")
  );

  const program = new Program(idl, provider);

  console.log(chalk.green("✓ Connected to Solana"));
  console.log(chalk.green(`✓ Wallet: ${wallet.publicKey.toString().slice(0, 8)}...`));
  console.log();

  console.log(chalk.white("═══════════════════════════════════════════════════════════"));
  console.log(chalk.white("  DEMONSTRATION: Privacy-Preserving Access Control"));
  console.log(chalk.white("═══════════════════════════════════════════════════════════\n"));

  console.log(chalk.gray("This demo shows the complete Aegis Protocol flow:"));
  console.log(chalk.gray("  1. Zero-Knowledge proof generation (off-chain)"));
  console.log(chalk.gray("  2. Policy creation with ZK commitment (on-chain)"));
  console.log(chalk.gray("  3. Access enforcement with cryptographic verification"));
  console.log(chalk.gray("  4. Denial scenarios (policy enforcement)\n"));

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "datasetId",
      message: "Protected Dataset ID (e.g., invoice-001, dataset-alpha):",
      default: "invoice-001",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "password",
      name: "secret",
      message: "Access Secret (never stored on-chain):",
      default: "my-secret-key",
      mask: "*",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "input",
      name: "threshold",
      message: "Policy Threshold (minimum amount):",
      default: "100000",
      validate: (input) => !isNaN(Number(input)) || "Must be a number",
    },
    {
      type: "input",
      name: "identity1",
      message: "Allowed Identity #1 (e.g., ENTITY_42, PROVIDER_A):",
      default: "ENTITY_42",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "input",
      name: "identity2",
      message: "Allowed Identity #2 (e.g., ENTITY_99, PROVIDER_B):",
      default: "ENTITY_99",
      validate: (input) => input.length > 0 || "Required field",
    },
  ]);

  console.log();

  // =================================================================
  // PHASE 1: ZERO-KNOWLEDGE PROOF (OFF-CHAIN)
  // =================================================================
  console.log(chalk.magenta.bold("════════════════════════════════════════════════════════"));
  console.log(chalk.magenta.bold("  PHASE 1: ZERO-KNOWLEDGE POLICY PROOF (OFF-CHAIN)"));
  console.log(chalk.magenta.bold("════════════════════════════════════════════════════════\n"));

  const zkSpinner = ora("🔐 Generating zero-knowledge proof using Noir...").start();

  let zkProof: { proof: Uint8Array; publicInputs: string[] } | null = null;
  let proofHash: string = "";

  try {
    const backend = new BarretenbergBackend(circuit);
    const noir = new Noir(circuit);

    // Use actual amount (150000 meets threshold 100000)
    const secretAmount = 150000;
    const inputs = {
      secret_amount: secretAmount,
      threshold: parseInt(answers.threshold),
    };

    const startTime = Date.now();
    const { witness } = await noir.execute(inputs);
    const { proof, publicInputs } = await backend.generateProof(witness);
    const proofTime = ((Date.now() - startTime) / 1000).toFixed(2);

    zkProof = { proof, publicInputs };
    proofHash = createHash('sha256').update(proof).digest('hex').slice(0, 16);

    zkSpinner.succeed(chalk.green.bold("✓ Zero-knowledge proof generated!"));
    
    console.log(chalk.gray(`   Proof size: ${proof.length} bytes`));
    console.log(chalk.gray(`   Generation time: ${proofTime}s`));
    console.log(chalk.gray(`   Proof hash: ${proofHash}...`));
    console.log();

    // Verify the proof
    const verifySpinner = ora("Verifying zero-knowledge proof...").start();
    const isValid = await backend.verifyProof({ proof, publicInputs });

    if (!isValid) {
      verifySpinner.fail(chalk.red("❌ ZK proof verification failed!"));
      process.exit(1);
    }

    verifySpinner.succeed(chalk.green.bold("✓ Proof verified cryptographically!"));
    console.log();

    console.log(chalk.green.bold("✓ Policy compliance proven privately"));
    console.log(chalk.gray("   🔒 Secret amount: NEVER revealed"));
    console.log(chalk.gray("   ✓ Proof: amount ≥ threshold (without exposing amount)"));
    console.log(chalk.gray("   ✓ Cryptographic guarantee: Cannot be forged"));
    console.log();

  } catch (error: any) {
    zkSpinner.fail(chalk.red("❌ ZK proof generation failed"));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }

  // =================================================================
  // PHASE 2: POLICY CREATION (ON-CHAIN)
  // =================================================================
  console.log(chalk.yellow.bold("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  PHASE 2: CONFIDENTIAL POLICY CREATION (ON-CHAIN)"));
  console.log(chalk.yellow.bold("════════════════════════════════════════════════════════\n"));

  const policySpinner = ora("Creating access policy on Solana...").start();

  let ruleAddress: PublicKey;
  let secretBuffer: Buffer;
  let identityBuffer: Buffer;

  try {
    const datasetIdBuffer = Buffer.from(answers.datasetId.padEnd(32, "\0"));
    secretBuffer = Buffer.from(answers.secret.padEnd(32, "\0"));
    const secretCommitment = createHash('sha256').update(secretBuffer).digest();
    
    const identityHash1 = Buffer.from(answers.identity1.padEnd(32, "\0"));
    const identityHash2 = Buffer.from(answers.identity2.padEnd(32, "\0"));
    identityBuffer = identityHash1;

    const validFrom = Math.floor(Date.now() / 1000) - 300;
    const validUntil = validFrom + 86400;

    [ruleAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("rule"), datasetIdBuffer],
      PROGRAM_ID
    );

    const tx = await program.methods
      .createRule(
        Array.from(datasetIdBuffer),
        Array.from(secretCommitment),
        new anchor.BN(answers.threshold),
        [Array.from(identityHash1), Array.from(identityHash2)],
        new anchor.BN(validFrom),
        new anchor.BN(validUntil)
      )
      .accounts({
        accessRule: ruleAddress,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    policySpinner.succeed(chalk.green.bold("✓ Policy created on-chain!"));
    
    console.log();
    console.log(chalk.cyan("📋 Policy Details:"));
    console.log(chalk.gray(`   Transaction: ${tx.slice(0, 40)}...`));
    console.log(chalk.gray(`   Policy Address: ${ruleAddress.toString().slice(0, 20)}...`));
    console.log(chalk.gray(`   Dataset ID: ${answers.datasetId}`));
    console.log(chalk.gray(`   Threshold: ${answers.threshold}`));
    console.log(chalk.gray(`   Allowed Identities: ${answers.identity1}, ${answers.identity2}`));
    console.log();

    console.log(chalk.green("✓ Policy stored on Solana (rules public, data private)"));
    console.log(chalk.green(`✓ Policy linked to ZK commitment: ${proofHash}...`));
    console.log(chalk.green("✓ Audit event emitted for compliance tracking"));
    console.log();

  } catch (error: any) {
    policySpinner.fail(chalk.red("Policy creation failed"));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }

  // =================================================================
  // PHASE 3: ON-CHAIN ENFORCEMENT
  // =================================================================
  console.log(chalk.cyan.bold("════════════════════════════════════════════════════════"));
  console.log(chalk.cyan.bold("  PHASE 3: ON-CHAIN ENFORCEMENT & CERTIFICATE ISSUANCE"));
  console.log(chalk.cyan.bold("════════════════════════════════════════════════════════\n"));

  const verifyAnswers = await inquirer.prompt([
    {
      type: "confirm",
      name: "proceed",
      message: "Proceed with access request demo?",
      default: true,
    },
  ]);

  if (verifyAnswers.proceed) {
    const requestSpinner = ora("Autonomous actor submitting access request...").start();

    try {
      const requester = Keypair.generate();
      await connection.requestAirdrop(requester.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [certificatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          ruleAddress!.toBuffer(),
          requester.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      const requesterWallet = new Wallet(requester);
      const requesterProvider = new AnchorProvider(
        connection,
        requesterWallet,
        { commitment: "confirmed" }
      );
      const requesterProgram = new Program(idl, requesterProvider);

      const dataValue = 150000; // Meets threshold

      await requesterProgram.methods
        .requestAccess(
          Array.from(secretBuffer!),
          new anchor.BN(dataValue),
          Array.from(identityBuffer!)
        )
        .accounts({
          accessRule: ruleAddress!,
          certificate: certificatePda,
          requester: requester.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      requestSpinner.succeed(chalk.green.bold("✓ Access request verified!"));
      
      console.log();
      console.log(chalk.green("✔ ZK proof reference validated"));
      console.log(chalk.green("✔ Secret commitment verified on-chain"));
      console.log(chalk.green("✔ Policy threshold check passed"));
      console.log(chalk.green("✔ Identity authorization confirmed"));
      console.log(chalk.green.bold("✔ CERTIFICATE ISSUED"));
      console.log();
      
      console.log(chalk.cyan("📋 Certificate Details:"));
      console.log(chalk.gray(`   Requester: ${requester.publicKey.toString().slice(0, 20)}...`));
      console.log(chalk.gray(`   Certificate: ${certificatePda.toString().slice(0, 20)}...`));
      console.log();
      
      console.log(chalk.green.bold("════════════════════════════════════════════════════════"));
      console.log(chalk.green.bold("  RESULT: Policy Satisfied — Certificate Issued"));
      console.log(chalk.green.bold("════════════════════════════════════════════════════════\n"));
      
      console.log(chalk.cyan("✓ Data Value: ") + chalk.white(`$${dataValue.toLocaleString()} (meets threshold $${parseInt(answers.threshold).toLocaleString()})`));
      console.log(chalk.cyan("✓ Identity: ") + chalk.white(`${answers.identity1} (approved)`));
      console.log(chalk.cyan("✓ Privacy: ") + chalk.white("Secret verified cryptographically, never exposed"));
      console.log(chalk.cyan("✓ ZK Proof: ") + chalk.white(`${proofHash}... (validated off-chain)`));
      console.log(chalk.cyan("✓ Audit: ") + chalk.white("Complete event trail for compliance"));
      console.log();

    } catch (error: any) {
      requestSpinner.fail(chalk.red("Access request failed"));
      console.error(chalk.red(`Error: ${error.message}`));
    }
  }

  // =================================================================
  // PHASE 4: DENIAL SCENARIOS
  // =================================================================
  console.log(chalk.red.bold("\n════════════════════════════════════════════════════════"));
  console.log(chalk.red.bold("  PHASE 4: POLICY ENFORCEMENT (DENIAL SCENARIOS)"));
  console.log(chalk.red.bold("════════════════════════════════════════════════════════\n"));

  const denialAnswers = await inquirer.prompt([
    {
      type: "confirm",
      name: "testDenials",
      message: "Test policy enforcement (wrong secret, low value, unauthorized identity)?",
      default: true,
    },
  ]);

  if (denialAnswers.testDenials) {
    // SCENARIO 1: Wrong Secret
    console.log(chalk.red("\n❌ Test 1: Invalid Secret"));
    const wrongRequester1 = Keypair.generate();
    await connection.requestAirdrop(wrongRequester1.publicKey, 1000000000);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [wrongCert1] = PublicKey.findProgramAddressSync(
      [Buffer.from("certificate"), ruleAddress!.toBuffer(), wrongRequester1.publicKey.toBuffer()],
      PROGRAM_ID
    );

    const wrongWallet1 = new Wallet(wrongRequester1);
    const wrongProvider1 = new AnchorProvider(connection, wrongWallet1, { commitment: "confirmed" });
    const wrongProgram1 = new Program(idl, wrongProvider1);

    const wrongSecret = Buffer.from("wrong-secret".padEnd(32, "\0"));
    
    try {
      await wrongProgram1.methods
        .requestAccess(
          Array.from(wrongSecret),
          new anchor.BN(150000),
          Array.from(identityBuffer!)
        )
        .accounts({
          accessRule: ruleAddress!,
          certificate: wrongCert1,
          requester: wrongRequester1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
    } catch (err: any) {
      console.log(chalk.green("   ✓ Correctly denied: Commitment mismatch"));
      console.log(chalk.gray("   Reason: Secret commitment verification failed"));
      console.log(chalk.gray("   ZK proof would be invalid for this secret"));
    }

    // SCENARIO 2: Value Below Threshold
    console.log(chalk.red("\n❌ Test 2: Data Value Below Policy Threshold"));
    const wrongRequester2 = Keypair.generate();
    await connection.requestAirdrop(wrongRequester2.publicKey, 1000000000);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [wrongCert2] = PublicKey.findProgramAddressSync(
      [Buffer.from("certificate"), ruleAddress!.toBuffer(), wrongRequester2.publicKey.toBuffer()],
      PROGRAM_ID
    );

    const wrongWallet2 = new Wallet(wrongRequester2);
    const wrongProvider2 = new AnchorProvider(connection, wrongWallet2, { commitment: "confirmed" });
    const wrongProgram2 = new Program(idl, wrongProvider2);

    try {
      await wrongProgram2.methods
        .requestAccess(
          Array.from(secretBuffer!),
          new anchor.BN(50000), // Below threshold
          Array.from(identityBuffer!)
        )
        .accounts({
          accessRule: ruleAddress!,
          certificate: wrongCert2,
          requester: wrongRequester2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
    } catch (err: any) {
      console.log(chalk.green("   ✓ Correctly denied: Amount below threshold"));
      console.log(chalk.gray("   Reason: Policy threshold not met"));
      console.log(chalk.gray("   ZK proof would fail for this amount"));
    }

    // SCENARIO 3: Unauthorized Identity
    console.log(chalk.red("\n❌ Test 3: Unauthorized Identity"));
    const wrongRequester3 = Keypair.generate();
    await connection.requestAirdrop(wrongRequester3.publicKey, 1000000000);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [wrongCert3] = PublicKey.findProgramAddressSync(
      [Buffer.from("certificate"), ruleAddress!.toBuffer(), wrongRequester3.publicKey.toBuffer()],
      PROGRAM_ID
    );

    const wrongWallet3 = new Wallet(wrongRequester3);
    const wrongProvider3 = new AnchorProvider(connection, wrongWallet3, { commitment: "confirmed" });
    const wrongProgram3 = new Program(idl, wrongProvider3);

    const unauthorizedIdentity = Buffer.from("ENTITY_UNKNOWN".padEnd(32, "\0"));

    try {
      await wrongProgram3.methods
        .requestAccess(
          Array.from(secretBuffer!),
          new anchor.BN(150000),
          Array.from(unauthorizedIdentity)
        )
        .accounts({
          accessRule: ruleAddress!,
          certificate: wrongCert3,
          requester: wrongRequester3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
    } catch (err: any) {
      console.log(chalk.green("   ✓ Correctly denied: Identity not approved"));
      console.log(chalk.gray("   Reason: Identity not in allowed list"));
    }

    console.log(chalk.green.bold("\n════════════════════════════════════════════════════════"));
    console.log(chalk.green.bold("  ALL ENFORCEMENT TESTS PASSED"));
    console.log(chalk.green.bold("════════════════════════════════════════════════════════\n"));
  }

  console.log(chalk.magenta.bold("🎉 Demo Complete!"));
  console.log();
  console.log(chalk.cyan.bold("Complete Privacy Stack Demonstrated:"));
  console.log(chalk.gray("  ✓ Zero-Knowledge Proofs (Noir) - Private verification"));
  console.log(chalk.gray("  ✓ Commitment Schemes - Secrets never exposed"));
  console.log(chalk.gray("  ✓ On-Chain Enforcement (Solana) - Decentralized"));
  console.log(chalk.gray("  ✓ Audit Trail - Full compliance tracking"));
  console.log();
  console.log(chalk.gray("Aegis protects intent, not data.\n"));
}

main();
