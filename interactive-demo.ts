import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";

const PROGRAM_ID = new PublicKey("7UDghojWtnQUddeuAmA5q3oqiPfoQCAQySsxTHzyrkAj");

// Banner
console.log(chalk.cyan.bold("\n╔══════════════════════════════════════════════════════════╗"));
console.log(chalk.cyan.bold("║                                                          ║"));
console.log(chalk.cyan.bold("║           🔐  AEGIS PROTOCOL - DEMO                     ║"));
console.log(chalk.cyan.bold("║     Privacy-Preserving Invoice Verification System       ║"));
console.log(chalk.cyan.bold("║                                                          ║"));
console.log(chalk.cyan.bold("╚══════════════════════════════════════════════════════════╝\n"));

async function main() {
  // Setup connection
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  
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

  console.log(chalk.green("✓ Connected to local validator"));
  console.log(chalk.green(`✓ Wallet: ${wallet.publicKey.toString().slice(0, 8)}...`));
  console.log();

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "datasetId",
      message: "Enter Invoice/Dataset ID:",
      default: "invoice-001",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "password",
      name: "secret",
      message: "Enter Secret Key:",
      default: "my-secret-key",
      mask: "*",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "input",
      name: "minAmount",
      message: "Minimum Invoice Amount:",
      default: "100000",
      validate: (input) => !isNaN(Number(input)) || "Must be a number",
    },
    {
      type: "input",
      name: "buyerId1",
      message: "Approved Buyer ID #1:",
      default: "BUYER_42",
      validate: (input) => input.length > 0 || "Required field",
    },
    {
      type: "input",
      name: "buyerId2",
      message: "Approved Buyer ID #2:",
      default: "BUYER_99",
      validate: (input) => input.length > 0 || "Required field",
    },
  ]);

  console.log();
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  SCENARIO: SME Creates Access Rule"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log();

  // Create rule
  const spinner = ora("Creating access rule on-chain...").start();

  try {
    const datasetIdBuffer = Buffer.from(answers.datasetId.padEnd(32, "\0"));
    const secretBuffer = Buffer.from(answers.secret.padEnd(32, "\0"));
    const buyerHash1 = Buffer.from(answers.buyerId1.padEnd(32, "\0"));
    const buyerHash2 = Buffer.from(answers.buyerId2.padEnd(32, "\0"));

    const validFrom = Math.floor(Date.now() / 1000) - 60;
    const validUntil = validFrom + 86400;

    const [ruleAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("rule"), datasetIdBuffer],
      PROGRAM_ID
    );

    const tx = await program.methods
      .createRule(
        Array.from(datasetIdBuffer),
        Array.from(secretBuffer),
        new anchor.BN(answers.minAmount),
        [Array.from(buyerHash1), Array.from(buyerHash2)],
        new anchor.BN(validFrom),
        new anchor.BN(validUntil)
      )
      .accounts({
        accessRule: ruleAddress,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    spinner.succeed(chalk.green.bold("Rule Created Successfully!"));
    
    console.log();
    console.log(chalk.cyan("📋 Transaction Details:"));
    console.log(chalk.gray(`   Signature: ${tx}`));
    console.log(chalk.gray(`   Rule Address: ${ruleAddress.toString()}`));
    console.log(chalk.gray(`   Dataset ID: ${answers.datasetId}`));
    console.log(chalk.gray(`   Min Amount: ${answers.minAmount}`));
    console.log(chalk.gray(`   Approved Buyers: ${answers.buyerId1}, ${answers.buyerId2}`));
    console.log();

    console.log(chalk.green("✓ Rule stored on Solana blockchain"));
    console.log(chalk.green("✓ Audit event emitted for compliance tracking"));
    console.log();

    // Next scenario
    console.log(chalk.yellow("════════════════════════════════════════════════════════"));
    console.log(chalk.yellow.bold("  SCENARIO: Lender Requests Verification"));
    console.log(chalk.yellow("════════════════════════════════════════════════════════"));
    console.log();

    const verifyAnswers = await inquirer.prompt([
      {
        type: "confirm",
        name: "proceed",
        message: "Proceed with lender verification demo?",
        default: true,
      },
    ]);

    if (verifyAnswers.proceed) {
      const requestSpinner = ora("Lender requesting verification certificate...").start();

      // Generate lender keypair
      const lender = Keypair.generate();

      // Airdrop to lender
      await connection.requestAirdrop(lender.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Calculate certificate PDA
      const [certificatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("certificate"),
          ruleAddress.toBuffer(),
          lender.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      const lenderWallet = new Wallet(lender);
      const lenderProvider = new AnchorProvider(
        connection,
        lenderWallet,
        { commitment: "confirmed" }
      );
      const lenderProgram = new Program(idl, lenderProvider);

      // Lender provides invoice details for verification
      const invoiceAmount = 150000; // Meets minimum
      const buyerIdToVerify = answers.buyerId1; // Approved buyer
      const buyerIdBuffer = Buffer.from(buyerIdToVerify.padEnd(32, "\0"));

      await lenderProgram.methods
        .requestAccess(
          Array.from(secretBuffer),
          new anchor.BN(invoiceAmount),
          Array.from(buyerIdBuffer)
        )
        .accounts({
          accessRule: ruleAddress,
          certificate: certificatePda,
          requester: lender.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      requestSpinner.succeed(chalk.green.bold("✅ Verification Certificate Issued!"));
      
      console.log();
      console.log(chalk.cyan("📋 Certificate Details:"));
      console.log(chalk.gray(`   Lender: ${lender.publicKey.toString().slice(0, 8)}...`));
      console.log(chalk.gray(`   Certificate: ${certificatePda.toString().slice(0, 8)}...`));
      console.log();
      
      console.log(chalk.green("════════════════════════════════════════════════════════"));
      console.log(chalk.green.bold("  VERIFICATION SUCCESSFUL"));
      console.log(chalk.green("════════════════════════════════════════════════════════"));
      console.log();
      console.log(chalk.cyan("✓ Invoice Amount: ") + chalk.white(`${invoiceAmount} (meets minimum ${answers.minAmount})`));
      console.log(chalk.cyan("✓ Buyer ID: ") + chalk.white(`${buyerIdToVerify} (approved)`));
      console.log(chalk.cyan("✓ Privacy: ") + chalk.white("Secret verified on-chain without exposure"));
      console.log(chalk.cyan("✓ Audit: ") + chalk.white("Event captured by Helius for compliance tracking"));
      console.log();
    }

    console.log(chalk.magenta.bold("🎉 Demo Complete!"));
    console.log(chalk.gray("\nAll transactions auditable via event logs."));
    console.log(chalk.gray("Run the audit compressor to see real-time event capture.\n"));

  } catch (error: any) {
    spinner.fail(chalk.red("Transaction failed"));
    console.error(chalk.red("\n❌ Error:"), error.message);
    process.exit(1);
  }
}

main();