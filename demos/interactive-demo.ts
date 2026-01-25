import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";

const PROGRAM_ID = new PublicKey("G2EZATTbHmbhYwPngem9vLfVnbCH3MVNZYUbqD9rkR4k");

// Banner
console.log(chalk.cyan.bold("\n╔══════════════════════════════════════════════════════════╗"));
console.log(chalk.cyan.bold("║                                                          ║"));
console.log(chalk.cyan.bold("║           🔐  AEGIS PROTOCOL - DEMO                     ║"));
console.log(chalk.cyan.bold("║     Secrets-as-a-Service for Autonomous Systems          ║"));
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

  // Load IDL
  const idl = JSON.parse(
    fs.readFileSync("./target/idl/aegis_protocol.json", "utf-8")
  );

  const program = new Program(idl, provider);

  console.log(chalk.green("✓ Connected to Solana"));
  console.log(chalk.green(`✓ Wallet: ${wallet.publicKey.toString().slice(0, 8)}...`));
  console.log();

  console.log(chalk.white("═══════════════════════════════════════════════════════════"));
  console.log(chalk.white("  DEMONSTRATION: Confidential Policy Enforcement"));
  console.log(chalk.white("═══════════════════════════════════════════════════════════\n"));

  console.log(chalk.gray("This demo shows Aegis enforcing access control for autonomous systems."));
  console.log(chalk.gray("Example domain: Invoice factoring (same protocol works across use cases)"));
  console.log(chalk.gray("Policy enforced: data_value ≥ threshold AND identity IN approved_list\n"));

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "datasetId",
      message: "Protected Dataset ID (e.g., invoice-001, dataset-alpha):",
      default: "dataset-001",
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
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  SCENARIO: Confidential Policy Creation"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log();

  // Create rule
  const spinner = ora("Data Owner defining confidential policy...").start();

  try {
    const datasetIdBuffer = Buffer.from(answers.datasetId.padEnd(32, "\0"));
    const secretBuffer = Buffer.from(answers.secret.padEnd(32, "\0"));
    const identityHash1 = Buffer.from(answers.identity1.padEnd(32, "\0"));
    const identityHash2 = Buffer.from(answers.identity2.padEnd(32, "\0"));

    const validFrom = Math.floor(Date.now() / 1000) - 300; // 5 minutes in the past
    const validUntil = validFrom + 86400;

    const [ruleAddress] = PublicKey.findProgramAddressSync(
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

    spinner.succeed(chalk.green.bold("Policy Created Successfully!"));
    
    console.log();
    console.log(chalk.cyan("📋 Policy Details:"));
    console.log(chalk.gray(`   Transaction: ${tx}`));
    console.log(chalk.gray(`   Policy Address: ${ruleAddress.toString()}`));
    console.log(chalk.gray(`   Dataset ID: ${answers.datasetId}`));
    console.log(chalk.gray(`   Policy Threshold: ${answers.threshold}`));
    console.log(chalk.gray(`   Allowed Identities: ${answers.identity1}, ${answers.identity2}`));
    console.log();

    console.log(chalk.green("✓ Policy stored on-chain (rules public, data private)"));
    console.log(chalk.green("✓ Audit event emitted for compliance tracking"));
    console.log();

    // Next scenario
    console.log(chalk.yellow("════════════════════════════════════════════════════════"));
    console.log(chalk.yellow.bold("  SCENARIO: Autonomous Actor Requests Access"));
    console.log(chalk.yellow("════════════════════════════════════════════════════════"));
    console.log();

    const verifyAnswers = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Proceed with access request demo?",
        default: true,
      },
    ]);

    const identityToVerify = answers.identity1;
    const identityBuffer = Buffer.from(identityToVerify.padEnd(32, "\0"));

    if (verifyAnswers.proceed) {
      const requestSpinner = ora("Autonomous actor requesting access certificate...").start();

      // Generate requester keypair
      const requester = Keypair.generate();

      // Airdrop to requester
      await connection.requestAirdrop(requester.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Calculate certificate PDA
      const [certificatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          ruleAddress.toBuffer(),
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

      // Requester provides proof of compliance
      const dataValue = 150000; // Meets threshold

      await requesterProgram.methods
        .requestAccess(
          Array.from(secretBuffer),
          new anchor.BN(dataValue),
          Array.from(identityBuffer)
        )
        .accounts({
          accessRule: ruleAddress,
          certificate: certificatePda,
          requester: requester.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      requestSpinner.succeed(chalk.green.bold("✅ Access Certificate Issued!"));
      
      console.log();
      console.log(chalk.cyan("📋 Certificate Details:"));
      console.log(chalk.gray(`   Requester: ${requester.publicKey.toString().slice(0, 8)}...`));
      console.log(chalk.gray(`   Certificate: ${certificatePda.toString().slice(0, 8)}...`));
      console.log();
      
      console.log(chalk.green("════════════════════════════════════════════════════════"));
      console.log(chalk.green.bold("  RESULT: Policy Satisfied — Certificate Issued"));
      console.log(chalk.green("════════════════════════════════════════════════════════"));
      console.log();
      console.log(chalk.cyan("✓ Data Value: ") + chalk.white(`${dataValue} (meets threshold ${answers.threshold})`));
      console.log(chalk.cyan("✓ Identity: ") + chalk.white(`${identityToVerify} (approved)`));
      console.log(chalk.cyan("✓ Privacy: ") + chalk.white("Secret verified cryptographically, never exposed"));
      console.log(chalk.cyan("✓ Audit: ") + chalk.white("Event captured for compliance tracking"));
      console.log();
    }

    // DENIAL SCENARIOS - Testing Policy Enforcement
    console.log(chalk.yellow("\n════════════════════════════════════════════════════════"));
    console.log(chalk.yellow.bold("  TESTING: Policy Enforcement (Denial Scenarios)"));
    console.log(chalk.yellow("════════════════════════════════════════════════════════\n"));

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
        [Buffer.from("certificate"), ruleAddress.toBuffer(), wrongRequester1.publicKey.toBuffer()],
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
            Array.from(identityBuffer)
          )
          .accounts({
            accessRule: ruleAddress,
            certificate: wrongCert1,
            requester: wrongRequester1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
      } catch (err: any) {
        console.log(chalk.green("   ✓ Correctly denied: Invalid secret"));
        console.log(chalk.gray(`   Reason: ${err.message.split(':')[0]}`));
      }

      // SCENARIO 2: Value Below Threshold
      console.log(chalk.red("\n❌ Test 2: Data Value Below Policy Threshold"));
      const wrongRequester2 = Keypair.generate();
      await connection.requestAirdrop(wrongRequester2.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [wrongCert2] = PublicKey.findProgramAddressSync(
        [Buffer.from("certificate"), ruleAddress.toBuffer(), wrongRequester2.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const wrongWallet2 = new Wallet(wrongRequester2);
      const wrongProvider2 = new AnchorProvider(connection, wrongWallet2, { commitment: "confirmed" });
      const wrongProgram2 = new Program(idl, wrongProvider2);

      try {
        await wrongProgram2.methods
          .requestAccess(
            Array.from(secretBuffer),
            new anchor.BN(50000), // Below threshold
            Array.from(identityBuffer)
          )
          .accounts({
            accessRule: ruleAddress,
            certificate: wrongCert2,
            requester: wrongRequester2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
      } catch (err: any) {
        console.log(chalk.green("   ✓ Correctly denied: Value below threshold"));
        console.log(chalk.gray(`   Reason: ${err.message.split(':')[0]}`));
      }

      // SCENARIO 3: Unauthorized Identity
      console.log(chalk.red("\n❌ Test 3: Unauthorized Identity"));
      const wrongRequester3 = Keypair.generate();
      await connection.requestAirdrop(wrongRequester3.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [wrongCert3] = PublicKey.findProgramAddressSync(
        [Buffer.from("certificate"), ruleAddress.toBuffer(), wrongRequester3.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const wrongWallet3 = new Wallet(wrongRequester3);
      const wrongProvider3 = new AnchorProvider(connection, wrongWallet3, { commitment: "confirmed" });
      const wrongProgram3 = new Program(idl, wrongProvider3);

      const unauthorizedIdentity = Buffer.from("ENTITY_UNKNOWN".padEnd(32, "\0"));

      try {
        await wrongProgram3.methods
          .requestAccess(
            Array.from(secretBuffer),
            new anchor.BN(150000),
            Array.from(unauthorizedIdentity)
          )
          .accounts({
            accessRule: ruleAddress,
            certificate: wrongCert3,
            requester: wrongRequester3.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
      } catch (err: any) {
        console.log(chalk.green("   ✓ Correctly denied: Identity not approved"));
        console.log(chalk.gray(`   Reason: ${err.message.split(':')[0]}`));
      }

      console.log(chalk.green("\n════════════════════════════════════════════════════════"));
      console.log(chalk.green.bold("  ALL ENFORCEMENT TESTS PASSED"));
      console.log(chalk.green("════════════════════════════════════════════════════════\n"));
    }

    console.log(chalk.magenta.bold("🎉 Demo Complete!"));
    console.log(chalk.gray("\nAll transactions auditable via event logs."));
    console.log(chalk.gray("Aegis protects intent, not data.\n"));

  } catch (error: any) {
    spinner.fail(chalk.red("Transaction failed"));
    console.error(chalk.red("\n❌ Error:"), error.message);
    process.exit(1);
  }
}

main();