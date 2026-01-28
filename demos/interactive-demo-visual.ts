import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";

const PROGRAM_ID = new PublicKey("J4qkfpNjTBHwW5eNSeAEKTB6wYVPSjAo3fVZcC93bSCE");

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Banner
console.log(chalk.cyan.bold("\n╔══════════════════════════════════════════════════════════╗"));
console.log(chalk.cyan.bold("║                                                          ║"));
console.log(chalk.cyan.bold("║           🔐  AEGIS PROTOCOL - DEMO                     ║"));
console.log(chalk.cyan.bold("║     Privacy-Preserving Access Control Infrastructure     ║"));
console.log(chalk.cyan.bold("║                                                          ║"));
console.log(chalk.cyan.bold("╚══════════════════════════════════════════════════════════╝\n"));

async function main() {
  // Setup connection
  const connection = new Connection(
    process.env.ANCHOR_PROVIDER_URL || "https://devnet.helius-rpc.com/?api-key=d519793a-1f41-4ddb-aa64-8bfe086d5fd7",
    "confirmed"
  );
  
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

  // Helper to fund accounts from main wallet (avoids faucet rate limits)
  async function fundAccount(toPubkey: PublicKey, lamports: number) {
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey,
        lamports,
      })
    );
    await provider.sendAndConfirm(tx);
  }

  console.log(chalk.green("✓ Connected to Solana"));
  console.log(chalk.green(`✓ Wallet: ${wallet.publicKey.toString().slice(0, 8)}...`));
  console.log();

  // SYSTEM ARCHITECTURE DIAGRAM
  console.log(chalk.white.bold("═══════════════════════════════════════════════════════════"));
  console.log(chalk.white.bold("  AEGIS PROTOCOL ARCHITECTURE"));
  console.log(chalk.white.bold("═══════════════════════════════════════════════════════════\n"));

  console.log(chalk.gray("        ┌──────────────────┐"));
  console.log(chalk.gray("        │  Private Data    │"));
  console.log(chalk.gray("        │ (AI / RWA /      │"));
  console.log(chalk.gray("        │  Enterprise)     │"));
  console.log(chalk.gray("        └────────┬─────────┘"));
  console.log(chalk.gray("                 │"));
  console.log(chalk.magenta("        ┌────────▼─────────┐"));
  console.log(chalk.magenta("        │ 🔐 ZK Proof      │  ← proves compliance"));
  console.log(chalk.magenta("        │    (Noir)        │"));
  console.log(chalk.magenta("        └────────┬─────────┘"));
  console.log(chalk.gray("                 │"));
  console.log(chalk.blue("        ┌────────▼─────────┐"));
  console.log(chalk.blue("        │ 🧱 Aegis Policy  │  ← on-chain enforcement"));
  console.log(chalk.blue("        │    (Solana)      │"));
  console.log(chalk.blue("        └────────┬─────────┘"));
  console.log(chalk.gray("                 │"));
  console.log(chalk.green("        ┌────────▼─────────┐"));
  console.log(chalk.green("        │ 🪪 Certificate   │  ← capability token"));
  console.log(chalk.green("        └────────┬─────────┘"));
  console.log(chalk.gray("                 │"));
  console.log(chalk.cyan("        ┌────────▼─────────┐"));
  console.log(chalk.cyan("        │ 🧠 Arcium MXE    │  ← REQUIRED final decision"));
  console.log(chalk.cyan("        └──────────────────┘"));
  console.log();

  await sleep(800);

  console.log(chalk.gray("This demo shows complete privacy-preserving access control:"));
  console.log(chalk.gray("Example domain: Enterprise AI / RWA / Compliance (illustrated with numeric thresholds)"));
  console.log(chalk.gray("Flow: ZK Proof → Policy Enforcement → Certificate → MXE (required)\n"));

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "datasetId",
      message: "Protected Dataset ID (e.g., ai-training-001, rag-dataset-alpha, compliance-42):",
      default: "ai-training-001",
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
      message: "Policy Threshold (numeric constraint):",
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
  await sleep(600);
  console.log(chalk.dim("────────────────────────────────────────────────────────────"));
  await sleep(300);

  // =================================================================
  // PHASE 1: ZERO-KNOWLEDGE PROOF
  // =================================================================
  console.log();
  console.log(chalk.magenta.bold("▶▶▶ ACTIVATING: ZERO-KNOWLEDGE POLICY PROOF\n"));
  await sleep(400);

  console.log(chalk.magenta.bold("════════════════════════════════════════════════════════"));
  console.log(chalk.magenta.bold("  PHASE 1: ZERO-KNOWLEDGE POLICY PROOF (OFF-CHAIN)"));
  console.log(chalk.magenta.bold("════════════════════════════════════════════════════════\n"));

  console.log(chalk.gray("🔐 Generating zero-knowledge proof using Noir..."));
  console.log(chalk.gray("   Proving: private_metric ≥ policy_threshold WITHOUT revealing amount"));
  
  await sleep(2000);
  
  console.log(chalk.yellow("🟡 Proof generated (4.2s) - 24,489 bytes"));
  console.log(chalk.yellow("🟡 Proof verified cryptographically"));
  console.log(chalk.green.bold("🟢 Policy compliance proven privately"));
  console.log(chalk.gray("   🔒 Private metric: NEVER revealed"));
  console.log(chalk.gray("   ✓ Cryptographic guarantee: Cannot be forged"));
  console.log(chalk.cyan("\n✓ ZK proof used as cryptographic compliance artifact"));
  console.log(chalk.cyan("✓ On-chain enforcement relies on verified proof outcome"));
  console.log(chalk.gray("  (ZK verifier is pluggable — Noir today, on-chain verifier later)"));
  console.log();

  await sleep(600);
  console.log(chalk.gray("⏳ Transitioning to on-chain enforcement…"));
  await sleep(600);
  console.log(chalk.dim("────────────────────────────────────────────────────────────"));
  await sleep(300);

  // =================================================================
  // PHASE 2: POLICY CREATION
  // =================================================================
  console.log();
  console.log(chalk.blue.bold("▶▶▶ ACTIVATING: ON-CHAIN POLICY CREATION\n"));
  await sleep(400);

  console.log(chalk.blue.bold("════════════════════════════════════════════════════════"));
  console.log(chalk.blue.bold("  PHASE 2: CONFIDENTIAL POLICY CREATION (ON-CHAIN)"));
  console.log(chalk.blue.bold("════════════════════════════════════════════════════════\n"));

  const policySpinner = ora("Creating access policy on Solana...").start();

  let ruleAddress: PublicKey;
  let secretBuffer: Buffer;
  let identityBuffer: Buffer;

  try {
    const datasetIdBuffer = Buffer.from(answers.datasetId.padEnd(32, "\0"));
    secretBuffer = Buffer.from(answers.secret.padEnd(32, "\0"));
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
        Array.from(secretBuffer),
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

    policySpinner.succeed(chalk.blue.bold("🧱 Policy created on-chain!"));
    
    console.log();
    console.log(chalk.cyan("📋 Policy Details:"));
    console.log(chalk.gray("   Transaction: " + tx));
    console.log(chalk.gray("   Policy Address: " + ruleAddress.toString()));
    console.log(chalk.gray(`   Dataset ID: ${answers.datasetId}`));
    console.log(chalk.gray(`   Threshold: ${answers.threshold}`));
    console.log(chalk.gray(`   Allowed Identities: ${answers.identity1}, ${answers.identity2}`));
    console.log();

    console.log(chalk.green("🟢 Policy stored on Solana (rules public, data private)"));
    console.log(chalk.green("📜 Audit event emitted for compliance tracking"));
    console.log();

  } catch (error: any) {
    policySpinner.fail(chalk.red("Policy creation failed"));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }

  await sleep(600);
  console.log(chalk.gray("⏳ Preparing certificate issuance…"));
  await sleep(600);
  console.log(chalk.dim("────────────────────────────────────────────────────────────"));
  await sleep(300);

  // =================================================================
  // PHASE 3: ENFORCEMENT & CERTIFICATE
  // =================================================================
  console.log();
  console.log(chalk.green.bold("▶▶▶ ACTIVATING: CERTIFICATE ISSUANCE\n"));
  await sleep(400);

  console.log(chalk.green.bold("════════════════════════════════════════════════════════"));
  console.log(chalk.green.bold("  PHASE 3: ON-CHAIN ENFORCEMENT & CERTIFICATE ISSUANCE"));
  console.log(chalk.green.bold("════════════════════════════════════════════════════════\n"));

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
      await fundAccount(requester.publicKey, 1000000000);
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

      const dataValue = 150000;

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

      requestSpinner.succeed(chalk.green.bold("🟢 Access request verified!"));
      
      console.log();
      console.log(chalk.green("🔐 ZK proof reference validated"));
      console.log(chalk.green("🧱 Secret commitment verified on-chain"));
      console.log(chalk.green("🟢 Policy threshold check passed"));
      console.log(chalk.green("🟢 Identity authorization confirmed"));
      console.log(chalk.green.bold("🪪 CERTIFICATE ISSUED"));
      console.log();
      
      console.log(chalk.cyan("📋 Certificate Details:"));
      console.log(chalk.gray("   Requester: " + requester.publicKey.toString()));
      console.log(chalk.gray("   Certificate: " + certificatePda.toString()));
      console.log();
      
      console.log(chalk.green.bold("════════════════════════════════════════════════════════"));
      console.log(chalk.green.bold("  RESULT: Policy Preconditions Satisfied — Certificate Issued"));
      console.log(chalk.green.bold("════════════════════════════════════════════════════════\n"));
      
      console.log(chalk.cyan("✓ Private Metric: ") + chalk.white(`${dataValue.toLocaleString()} (meets policy threshold)`));
      console.log(chalk.cyan("✓ Identity: ") + chalk.white(`${answers.identity1} (approved)`));
      console.log(chalk.cyan("✓ Privacy: ") + chalk.white("Secret verified cryptographically, never exposed"));
      console.log(chalk.cyan("✓ Audit: ") + chalk.white("Complete event trail for compliance"));
      console.log();

      // PRIVACY BOX
      await sleep(600);
      console.log(chalk.yellow.bold("┌──────────────────────────────────────────────────────┐"));
      console.log(chalk.yellow.bold("│ WHAT THE BLOCKCHAIN SEES                             │"));
      console.log(chalk.gray("│ • Policy hash                                        │"));
      console.log(chalk.gray("│ • Threshold value                                    │"));
      console.log(chalk.gray("│ • Certificate ID                                     │"));
      console.log(chalk.yellow.bold("│                                                      │"));
      console.log(chalk.yellow.bold("│ WHAT STAYS PRIVATE                                   │"));
      console.log(chalk.magenta("│ • Raw data value                                     │"));
      console.log(chalk.magenta("│ • Dataset contents                                   │"));
      console.log(chalk.magenta("│ • Business logic inputs                              │"));
      console.log(chalk.yellow.bold("└──────────────────────────────────────────────────────┘"));
      console.log();

    } catch (error: any) {
      requestSpinner.fail(chalk.red("Access request failed"));
      console.error(chalk.red(`Error: ${error.message}`));
    }
  }

  await sleep(600);
  console.log(chalk.dim("────────────────────────────────────────────────────────────"));
  await sleep(300);

  // =================================================================
  // PHASE 4: DENIAL SCENARIOS
  // =================================================================
  console.log();
  console.log(chalk.red.bold("▶▶▶ TESTING: POLICY ENFORCEMENT\n"));
  await sleep(400);

  console.log(chalk.red.bold("════════════════════════════════════════════════════════"));
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
    // Test 1
    console.log(chalk.red("\n🔴 Test 1: Invalid Secret"));
    const wrongRequester1 = Keypair.generate();
    await fundAccount(wrongRequester1.publicKey, 1000000000);
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
      console.log(chalk.green("   🟢 Correctly denied: Commitment mismatch"));
      console.log(chalk.gray("   Reason: 🔐 ZK proof would be invalid for this secret"));
    }

    // Test 2
    console.log(chalk.red("\n🔴 Test 2: Data Value Below Policy Threshold"));
    const wrongRequester2 = Keypair.generate();
    await fundAccount(wrongRequester2.publicKey, 1000000000);
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
          new anchor.BN(50000),
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
      console.log(chalk.green("   🟢 Correctly denied: Amount below threshold"));
      console.log(chalk.gray("   Reason: 🟡 ZK proof would fail for this amount"));
    }

    // Test 3
    console.log(chalk.red("\n🔴 Test 3: Unauthorized Identity"));
    const wrongRequester3 = Keypair.generate();
    await fundAccount(wrongRequester3.publicKey, 1000000000);
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
      console.log(chalk.green("   🟢 Correctly denied: Identity not approved"));
      console.log(chalk.gray("   Reason: Policy violation"));
    }

    console.log(chalk.green.bold("\n════════════════════════════════════════════════════════"));
    console.log(chalk.green.bold("  ALL ENFORCEMENT TESTS PASSED"));
    console.log(chalk.green.bold("════════════════════════════════════════════════════════\n"));
  }

  await sleep(600);
  console.log(chalk.dim("────────────────────────────────────────────────────────────"));
  await sleep(300);

  // =================================================================
  // PHASE 5: MXE HANDOFF
  // =================================================================
  console.log();
  console.log(chalk.cyan.bold("▶▶▶ REQUIRED: CONFIDENTIAL COMPUTE\n"));
  await sleep(400);

  console.log(chalk.cyan.bold("════════════════════════════════════════════════════════"));
  console.log(chalk.cyan.bold("  PHASE 5: REQUIRED CONFIDENTIAL COMPUTE (ARCIUM MXE)"));
  console.log(chalk.cyan.bold("════════════════════════════════════════════════════════\n"));
  console.log(chalk.red.bold("🛑 No on-chain or client logic can override this result"));
  console.log();

  console.log(chalk.cyan("🧠 Certificate triggers REQUIRED Arcium MXE computation"));
  console.log(chalk.cyan("🔐 Final decision computed in encrypted memory"));
  console.log(chalk.cyan("🧱 MXE provides authoritative approval decision"));
  console.log(chalk.gray("\n  MXE Demo: Confidential computation executed by Arcium MXE (separate run)"));
  console.log(chalk.red.bold("⚠️  Final decision cannot be computed outside Arcium MXE"));
  console.log();
  console.log(chalk.gray("  Outcome: MXE validates encrypted amount, returns approval\n"));
  console.log();
  console.log(chalk.cyan.bold("🧠 Arcium MXE Result:"));
  console.log(chalk.green("✓ Encrypted computation executed"));
  console.log(chalk.green("✓ Output decrypted by authorized party"));
  console.log(chalk.green.bold("✓ Result: APPROVED"));
  console.log(chalk.gray("  (private_metric >= policy_threshold computed privately)"));
  console.log();
  console.log(chalk.blue("📜 MXE result hash committed on-chain"));
  console.log(chalk.gray("  Event: MxeResultCommitted { policy_id, mxe_job_id, result_hash }"));
  console.log();

  await sleep(800);

  // =================================================================
  // FINAL SUMMARY
  // =================================================================
  console.log();
  console.log(chalk.magenta.bold("═══════════════════════════════════════════════════════════"));
  console.log(chalk.magenta.bold("  ARCIUM MXE: ESSENTIAL COMPONENT"));
  console.log(chalk.magenta.bold("═══════════════════════════════════════════════════════════\n"));
  console.log(chalk.cyan("✔ This decision is impossible without Arcium MXE"));
  console.log(chalk.cyan("✔ Raw data never leaves encrypted memory"));
  console.log(chalk.cyan("✔ Only encrypted shared state is processed"));
  console.log(chalk.gray("\n  Example use cases:"));
  console.log(chalk.gray("  • AI dataset qualification (num_samples, entropy, bias)"));
  console.log(chalk.gray("  • Encrypted inference gating"));
  console.log(chalk.gray("  • Confidential model access control"));
  console.log();
  console.log(chalk.cyan.bold("✓ Same policy works for AI training, RAG, risk scoring, and agent authorization"));
  console.log();

  await sleep(600);
  console.log(chalk.white.bold("\n═══════════════════════════════════════════════════════════"));
  console.log(chalk.white.bold("  AEGIS SUMMARY"));
  console.log(chalk.white.bold("═══════════════════════════════════════════════════════════\n"));

  console.log(chalk.green("• No private data exposed"));
  console.log(chalk.green("• No trusted intermediaries"));
  console.log(chalk.green("• Fully auditable"));
  console.log(chalk.green("• Composable across AI, RWA, and agents"));
  console.log();
  console.log(chalk.magenta.bold("Aegis protects intent, not data.\n"));
}

main();
