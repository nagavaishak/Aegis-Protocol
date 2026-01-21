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
console.log(chalk.magenta.bold("║       Privacy-Preserving Training Data Verification      ║"));
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
  console.log(chalk.cyan("  USE CASE: AI Training Data Compliance"));
  console.log(chalk.cyan("═══════════════════════════════════════════════════════════\n"));

  console.log(chalk.white("Scenario:"));
  console.log(chalk.gray("  An AI research lab needs to verify that training data for"));
  console.log(chalk.gray("  their LLM meets compliance requirements:"));
  console.log(chalk.gray("    • Minimum dataset size (1M+ samples)"));
  console.log(chalk.gray("    • Data from approved sources only"));
  console.log(chalk.gray("    • WITHOUT exposing actual dataset contents\n"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "datasetId",
      message: "AI Training Dataset ID:",
      default: "llm-training-v1",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "password",
      name: "secret",
      message: "Dataset Access Key (confidential):",
      default: "ai-lab-key-2025",
      mask: "*",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "input",
      name: "minSamples",
      message: "Minimum required samples:",
      default: "1000000",
      validate: (input) => !isNaN(Number(input)) || "Must be a number",
    },
    {
      type: "input",
      name: "source1",
      message: "Approved Data Source #1 (e.g., HuggingFace):",
      default: "HUGGINGFACE",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "input",
      name: "source2",
      message: "Approved Data Source #2 (e.g., Common Crawl):",
      default: "COMMON_CRAWL",
      validate: (input) => input.length > 0 || "Required field",
    },
  ]);

  console.log();
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  STEP 1: AI Lab Creates Compliance Rule"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log();

  const spinner = ora("Creating AI data compliance rule...").start();

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
        new anchor.BN(answers.minSamples),
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

    spinner.succeed(chalk.green.bold("Compliance Rule Created!"));
    
    console.log();
    console.log(chalk.cyan("📋 Rule Details:"));
    console.log(chalk.gray(`   Rule Address: ${ruleAddress.toString()}`));
    console.log(chalk.gray(`   Dataset: ${answers.datasetId}`));
    console.log(chalk.gray(`   Min Samples: ${Number(answers.minSamples).toLocaleString()}`));
    console.log(chalk.gray(`   Approved Sources: ${answers.source1}, ${answers.source2}`));
    console.log();

    console.log(chalk.green("✓ Rule stored on-chain"));
    console.log(chalk.green("✓ Dataset contents remain private"));
    console.log();

    console.log(chalk.yellow("════════════════════════════════════════════════════════"));
    console.log(chalk.yellow.bold("  STEP 2: AI Company Requests Verification"));
    console.log(chalk.yellow("════════════════════════════════════════════════════════"));
    console.log();

    const verifyAnswers = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Simulate AI company requesting training data verification?",
        default: true,
      },
    ]);

    const sourceToVerify = answers.source1;
    const sourceBuffer = Buffer.from(sourceToVerify.padEnd(32, "\0"));

    if (verifyAnswers.proceed) {
      const requestSpinner = ora("AI company requesting verification...").start();

      const aiCompany = Keypair.generate();
      await connection.requestAirdrop(aiCompany.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [certificatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          ruleAddress.toBuffer(),
          aiCompany.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      const companyWallet = new Wallet(aiCompany);
      const companyProvider = new AnchorProvider(connection, companyWallet, { commitment: "confirmed" });
      const companyProgram = new Program(idl, companyProvider);

      const sampleCount = 1500000; // Meets minimum

      await companyProgram.methods
        .requestAccess(
          Array.from(secretBuffer),
          new anchor.BN(sampleCount),
          Array.from(sourceBuffer)
        )
        .accounts({
          accessRule: ruleAddress,
          certificate: certificatePda,
          requester: aiCompany.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      requestSpinner.succeed(chalk.green.bold("✅ Verification Certificate Issued!"));
      
      console.log();
      console.log(chalk.cyan("📋 Certificate Details:"));
      console.log(chalk.gray(`   AI Company: ${aiCompany.publicKey.toString().slice(0, 8)}...`));
      console.log(chalk.gray(`   Certificate: ${certificatePda.toString().slice(0, 8)}...`));
      console.log();
      
      console.log(chalk.green("════════════════════════════════════════════════════════"));
      console.log(chalk.green.bold("  ✅ COMPLIANCE VERIFIED"));
      console.log(chalk.green("════════════════════════════════════════════════════════"));
      console.log();
      console.log(chalk.cyan("✓ Sample Count: ") + chalk.white(`${sampleCount.toLocaleString()} samples (meets ${Number(answers.minSamples).toLocaleString()} minimum)`));
      console.log(chalk.cyan("✓ Data Source: ") + chalk.white(`${sourceToVerify} (approved)`));
      console.log(chalk.cyan("✓ Privacy: ") + chalk.white("Training data contents never exposed on-chain"));
      console.log(chalk.cyan("✓ Compliance: ") + chalk.white("Verifiable proof for auditors & regulators"));
      console.log();

      console.log(chalk.magenta("═══════════════════════════════════════════════════════════"));
      console.log(chalk.magenta.bold("  🎯 AI DATA GOVERNANCE ACHIEVED"));
      console.log(chalk.magenta("═══════════════════════════════════════════════════════════\n"));

      console.log(chalk.white("Key Benefits:"));
      console.log(chalk.gray("  • Dataset privacy preserved (no data exposed on-chain)"));
      console.log(chalk.gray("  • Regulatory compliance proven cryptographically"));
      console.log(chalk.gray("  • Auditable trail without revealing sensitive training data"));
      console.log(chalk.gray("  • Same protocol, different domain (infrastructure!)"));
      console.log();
    }

    console.log(chalk.cyan("💡 This demonstrates Aegis Protocol as general-purpose"));
    console.log(chalk.cyan("   privacy infrastructure, not domain-specific tooling.\n"));

  } catch (error: any) {
    spinner.fail(chalk.red("Transaction failed"));
    console.error(chalk.red("\n❌ Error:"), error.message);
    process.exit(1);
  }
}

main();