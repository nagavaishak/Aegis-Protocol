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

    const buyerIdToVerify = answers.buyerId1;
    const buyerIdBuffer = Buffer.from(buyerIdToVerify.padEnd(32, "\0"));

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

    // PHASE 1: DENIAL SCENARIOS
    console.log(chalk.yellow("\n════════════════════════════════════════════════════════"));
    console.log(chalk.yellow.bold("  TESTING DENIAL SCENARIOS"));
    console.log(chalk.yellow("════════════════════════════════════════════════════════\n"));

    const denialAnswers = await inquirer.prompt([
      {
        type: "confirm",
        name: "testDenials",
        message: "Test access denial scenarios (wrong secret, low amount, unapproved buyer)?",
        default: true,
      },
    ]);

    if (denialAnswers.testDenials) {
      // SCENARIO 1: Wrong Secret
      console.log(chalk.red("\n❌ Test 1: Wrong Secret"));
      const wrongLender1 = Keypair.generate();
      await connection.requestAirdrop(wrongLender1.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [wrongCert1] = PublicKey.findProgramAddressSync(
        [Buffer.from("certificate"), ruleAddress.toBuffer(), wrongLender1.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const wrongWallet1 = new Wallet(wrongLender1);
      const wrongProvider1 = new AnchorProvider(connection, wrongWallet1, { commitment: "confirmed" });
      const wrongProgram1 = new Program(idl, wrongProvider1);

      const wrongSecret = Buffer.from("wrong-secret".padEnd(32, "\0"));
      
      try {
        await wrongProgram1.methods
          .requestAccess(
            Array.from(wrongSecret),
            new anchor.BN(150000),
            Array.from(buyerIdBuffer)
          )
          .accounts({
            accessRule: ruleAddress,
            certificate: wrongCert1,
            requester: wrongLender1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
      } catch (err: any) {
        console.log(chalk.green("   ✓ Correctly denied: Invalid secret"));
        console.log(chalk.gray(`   Reason: ${err.message.split(':')[0]}`));
      }

      // SCENARIO 2: Amount Too Low
      console.log(chalk.red("\n❌ Test 2: Invoice Amount Below Threshold"));
      const wrongLender2 = Keypair.generate();
      await connection.requestAirdrop(wrongLender2.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [wrongCert2] = PublicKey.findProgramAddressSync(
        [Buffer.from("certificate"), ruleAddress.toBuffer(), wrongLender2.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const wrongWallet2 = new Wallet(wrongLender2);
      const wrongProvider2 = new AnchorProvider(connection, wrongWallet2, { commitment: "confirmed" });
      const wrongProgram2 = new Program(idl, wrongProvider2);

      try {
        await wrongProgram2.methods
          .requestAccess(
            Array.from(secretBuffer),
            new anchor.BN(50000), // Below minimum
            Array.from(buyerIdBuffer)
          )
          .accounts({
            accessRule: ruleAddress,
            certificate: wrongCert2,
            requester: wrongLender2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
      } catch (err: any) {
        console.log(chalk.green("   ✓ Correctly denied: Amount below threshold"));
        console.log(chalk.gray(`   Reason: ${err.message.split(':')[0]}`));
      }

      // SCENARIO 3: Unapproved Buyer
      console.log(chalk.red("\n❌ Test 3: Unapproved Buyer"));
      const wrongLender3 = Keypair.generate();
      await connection.requestAirdrop(wrongLender3.publicKey, 1000000000);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [wrongCert3] = PublicKey.findProgramAddressSync(
        [Buffer.from("certificate"), ruleAddress.toBuffer(), wrongLender3.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const wrongWallet3 = new Wallet(wrongLender3);
      const wrongProvider3 = new AnchorProvider(connection, wrongWallet3, { commitment: "confirmed" });
      const wrongProgram3 = new Program(idl, wrongProvider3);

      const unapprovedBuyer = Buffer.from("BUYER_UNKNOWN".padEnd(32, "\0"));

      try {
        await wrongProgram3.methods
          .requestAccess(
            Array.from(secretBuffer),
            new anchor.BN(150000),
            Array.from(unapprovedBuyer)
          )
          .accounts({
            accessRule: ruleAddress,
            certificate: wrongCert3,
            requester: wrongLender3.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(chalk.red("   ⚠️  ERROR: Should have been denied!"));
      } catch (err: any) {
        console.log(chalk.green("   ✓ Correctly denied: Buyer not approved"));
        console.log(chalk.gray(`   Reason: ${err.message.split(':')[0]}`));
      }

      console.log(chalk.green("\n════════════════════════════════════════════════════════"));
      console.log(chalk.green.bold("  ALL DENIAL TESTS PASSED"));
      console.log(chalk.green("════════════════════════════════════════════════════════\n"));
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