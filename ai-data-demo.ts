import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";

const PROGRAM_ID = new PublicKey("G2EZATTbHmbhYwPngem9vLfVnbCH3MVNZYUbqD9rkR4k");

console.log(chalk.magenta.bold("\n╔══════════════════════════════════════════════════════════╗"));
console.log(chalk.magenta.bold("║                                                          ║"));
console.log(chalk.magenta.bold("║     🤖  AEGIS PROTOCOL - AI DATA DEMO                   ║"));
console.log(chalk.magenta.bold("║      Secrets-as-a-Service for AI Agent Governance        ║"));
console.log(chalk.magenta.bold("║                                                          ║"));
console.log(chalk.magenta.bold("╚══════════════════════════════════════════════════════════╝\n"));

async function main() {
  const connection = new Connection(
    process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899",
    "confirmed"
  );
  
  const walletPath = process.env.HOME + "/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const idl = JSON.parse(fs.readFileSync("./target/idl/aegis_protocol.json", "utf-8"));
  const program = new Program(idl, provider);

  console.log(chalk.green("✓ Connected to Solana"));
  console.log(chalk.green(`✓ Wallet: ${wallet.publicKey.toString().slice(0, 8)}...`));
  console.log();

  console.log(chalk.cyan("═══════════════════════════════════════════════════════════"));
  console.log(chalk.cyan("  USE CASE: AI Agent Training Data Governance"));
  console.log(chalk.cyan("═══════════════════════════════════════════════════════════\n"));

  console.log(chalk.white("Scenario:"));
  console.log(chalk.gray("  An AI research organization needs to govern autonomous access"));
  console.log(chalk.gray("  to training datasets. Aegis enforces:"));
  console.log(chalk.gray("    • Minimum dataset size (samples ≥ threshold)"));
  console.log(chalk.gray("    • Data from approved sources only"));
  console.log(chalk.gray("    • WITHOUT exposing actual dataset contents on-chain"));
  console.log(chalk.gray("\n  Key insight: AI agents need guardrails, not raw access.\n"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "datasetId",
      message: "Training Dataset ID:",
      default: "llm-training-v1",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "password",
      name: "secret",
      message: "Dataset Access Secret (never stored on-chain):",
      default: "ai-lab-key-2025",
      mask: "*",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "input",
      name: "threshold",
      message: "Policy Threshold (minimum samples):",
      default: "1000000",
      validate: (input) => !isNaN(Number(input)) || "Must be a number",
    },
    {
      type: "input",
      name: "source1",
      message: "Allowed Data Source #1:",
      default: "HUGGINGFACE",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "input",
      name: "source2",
      message: "Allowed Data Source #2:",
      default: "COMMON_CRAWL",
      validate: (input) => input.length > 0 || "Required field",
    },
  ]);

  console.log();
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  SCENARIO: Confidential Policy Creation"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log();

  const spinner = ora("Data Owner defining AI governance policy...").start();

  try {
    const datasetIdBuffer = Buffer.from(answers.datasetId.padEnd(32, "\0"));
    const secretBuffer = Buffer.from(answers.secret.padEnd(32, "\0"));
    const sourceHash1 = Buffer.from(answers.source1.padEnd(32, "\0"));
    const sourceHash2 = Buffer.from(answers.source2.padEnd(32, "\0"));

    const validFrom = Math.floor(Date.now() / 1000) - 300;
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
        [Array.from(sourceHash1), Array.from(sourceHash2)],
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
    console.log(chalk.gray(`   Policy Address: ${ruleAddress.toString()}`));
    console.log(chalk.gray(`   Dataset: ${answers.datasetId}`));
    console.log(chalk.gray(`   Policy Threshold: ${Number(answers.threshold).toLocaleString()} samples`));
    console.log(chalk.gray(`   Allowed Sources: ${answers.source1}, ${answers.source2}`));
    console.log();

    console.log(chalk.green("✓ Policy stored on-chain (rules public, data private)"));
    console.log(chalk.green("✓ Dataset contents remain confidential"));
    console.log();

    console.log(chalk.yellow("════════════════════════════════════════════════════════"));
    console.log(chalk.yellow.bold("  SCENARIO: Autonomous Actor Requests Access"));
    console.log(chalk.yellow("════════════════════════════════════════════════════════"));
    console.log();

    const verifyAnswers = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Simulate AI agent requesting dataset access?",
        default: true,
      },
    ]);

    const sourceToVerify = answers.source1;
    const sourceBuffer = Buffer.from(sourceToVerify.padEnd(32, "\0"));

    if (verifyAnswers.proceed) {
      const requestSpinner = ora("AI agent requesting access certificate...").start();

      const aiAgent = Keypair.generate();
      await connection.requestAirdrop(aiAgent.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [certificatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          ruleAddress.toBuffer(),
          aiAgent.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      const agentWallet = new Wallet(aiAgent);
      const agentProvider = new AnchorProvider(connection, agentWallet, { commitment: "confirmed" });
      const agentProgram = new Program(idl, agentProvider);

      const sampleCount = 1500000; // Meets threshold

      await agentProgram.methods
        .requestAccess(
          Array.from(secretBuffer),
          new anchor.BN(sampleCount),
          Array.from(sourceBuffer)
        )
        .accounts({
          accessRule: ruleAddress,
          certificate: certificatePda,
          requester: aiAgent.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      requestSpinner.succeed(chalk.green.bold("✅ Access Certificate Issued!"));
      
      console.log();
      console.log(chalk.cyan("📋 Certificate Details:"));
      console.log(chalk.gray(`   AI Agent: ${aiAgent.publicKey.toString().slice(0, 8)}...`));
      console.log(chalk.gray(`   Certificate: ${certificatePda.toString().slice(0, 8)}...`));
      console.log();
      
      console.log(chalk.green("════════════════════════════════════════════════════════"));
      console.log(chalk.green.bold("  RESULT: Policy Satisfied — Certificate Issued"));
      console.log(chalk.green("════════════════════════════════════════════════════════"));
      console.log();
      console.log(chalk.cyan("✓ Sample Count: ") + chalk.white(`${sampleCount.toLocaleString()} (meets ${Number(answers.threshold).toLocaleString()} threshold)`));
      console.log(chalk.cyan("✓ Data Source: ") + chalk.white(`${sourceToVerify} (approved)`));
      console.log(chalk.cyan("✓ Privacy: ") + chalk.white("Training data contents never exposed on-chain"));
      console.log(chalk.cyan("✓ Governance: ") + chalk.white("AI agent access controlled by cryptographic policy"));
      console.log();

      console.log(chalk.magenta("═══════════════════════════════════════════════════════════"));
      console.log(chalk.magenta.bold("  🎯 AI GOVERNANCE ACHIEVED"));
      console.log(chalk.magenta("═══════════════════════════════════════════════════════════\n"));

      console.log(chalk.white("Architecture Benefits:"));
      console.log(chalk.gray("  • Dataset privacy preserved (no raw data on-chain)"));
      console.log(chalk.gray("  • AI agent access governed by verifiable policy"));
      console.log(chalk.gray("  • Auditable trail without exposing training data"));
      console.log(chalk.gray("  • Same protocol, different domain (infrastructure!)"));
      console.log();
    }

    console.log(chalk.cyan("💡 Key Insight:"));
    console.log(chalk.cyan("   Aegis protects intent, not data."));
    console.log(chalk.cyan("   Same enforcement layer works across use cases.\n"));

  } catch (error: any) {
    spinner.fail(chalk.red("Transaction failed"));
    console.error(chalk.red("\n❌ Error:"), error.message);
    process.exit(1);
  }
}

main();