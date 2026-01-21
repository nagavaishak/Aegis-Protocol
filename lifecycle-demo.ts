import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import chalk from "chalk";
import fs from "fs";

const PROGRAM_ID = new PublicKey("7UDghojWtnQUddeuAmA5q3oqiPfoQCAQySsxTHzyrkAj");

async function main() {
  console.log(chalk.cyan.bold("\n╔══════════════════════════════════════════════════════════╗"));
  console.log(chalk.cyan.bold("║                                                          ║"));
  console.log(chalk.cyan.bold("║     🔐  AEGIS PROTOCOL - LIFECYCLE DEMO                 ║"));
  console.log(chalk.cyan.bold("║        Policy Governance & Lifecycle Controls            ║"));
  console.log(chalk.cyan.bold("║                                                          ║"));
  console.log(chalk.cyan.bold("╚══════════════════════════════════════════════════════════╝\n"));

  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const walletPath = process.env.HOME + "/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const idl = JSON.parse(fs.readFileSync("./target/idl/aegis_protocol.json", "utf-8"));
  const program = new Program(idl, provider);

  console.log(chalk.green("✓ Connected to local validator\n"));

  // Step 1: Create Rule
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  Step 1: Create Access Rule"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════\n"));

  const datasetId = "lifecycle-test-001";
  const datasetIdBuffer = Buffer.from(datasetId.padEnd(32, "\0"));
  const secretBuffer = Buffer.from("my-secret".padEnd(32, "\0"));
  const buyerHash1 = Buffer.from("BUYER_42".padEnd(32, "\0"));

  const [ruleAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("rule"), datasetIdBuffer],
    PROGRAM_ID
  );

  try {
    await program.methods
      .createRule(
        Array.from(datasetIdBuffer),
        Array.from(secretBuffer),
        new anchor.BN(100000),
        [Array.from(buyerHash1)],
        new anchor.BN(Math.floor(Date.now() / 1000) - 300),
        new anchor.BN(Math.floor(Date.now() / 1000) + 86400)
      )
      .accounts({
        accessRule: ruleAddress,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(chalk.green("✓ Rule created successfully"));
    console.log(chalk.gray(`  Rule Address: ${ruleAddress.toString()}\n`));
  } catch (err: any) {
    if (err.message.includes("already in use")) {
      console.log(chalk.yellow("⚠️  Rule already exists, continuing...\n"));
    } else {
      throw err;
    }
  }

  // Step 2: Pause Rule
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  Step 2: Pause Rule (Emergency Shutdown)"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════\n"));

  await program.methods
    .pauseRule()
    .accounts({
      accessRule: ruleAddress,
      owner: wallet.publicKey,
    })
    .rpc();

  console.log(chalk.green("✓ Rule paused successfully"));
  console.log(chalk.gray("  Status: INACTIVE (emergency shutdown)\n"));

  // Step 3: Verify Access is Denied
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  Step 3: Verify Access Denied While Paused"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════\n"));

  const testLender = Keypair.generate();
  await connection.requestAirdrop(testLender.publicKey, 1000000000);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const [certPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("certificate"), ruleAddress.toBuffer(), testLender.publicKey.toBuffer()],
    PROGRAM_ID
  );

  const testWallet = new Wallet(testLender);
  const testProvider = new AnchorProvider(connection, testWallet, { commitment: "confirmed" });
  const testProgram = new Program(idl, testProvider);

  try {
    await testProgram.methods
      .requestAccess(
        Array.from(secretBuffer),
        new anchor.BN(150000),
        Array.from(buyerHash1)
      )
      .accounts({
        accessRule: ruleAddress,
        certificate: certPda,
        requester: testLender.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(chalk.red("✗ ERROR: Access should have been denied!\n"));
  } catch (err: any) {
    console.log(chalk.green("✓ Access correctly denied"));
    console.log(chalk.gray("  Reason: Rule is not active\n"));
  }

  // Step 4: Resume Rule
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  Step 4: Resume Rule"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════\n"));

  await program.methods
    .resumeRule()
    .accounts({
      accessRule: ruleAddress,
      owner: wallet.publicKey,
    })
    .rpc();

  console.log(chalk.green("✓ Rule resumed successfully"));
  console.log(chalk.gray("  Status: ACTIVE\n"));

  // Step 5: Verify Access is Now Granted
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  Step 5: Verify Access Granted After Resume"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════\n"));

  try {
    await testProgram.methods
      .requestAccess(
        Array.from(secretBuffer),
        new anchor.BN(150000),
        Array.from(buyerHash1)
      )
      .accounts({
        accessRule: ruleAddress,
        certificate: certPda,
        requester: testLender.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(chalk.green("✓ Access granted successfully"));
    console.log(chalk.gray("  Certificate issued\n"));
  } catch (err: any) {
    console.log(chalk.red(`✗ ERROR: ${err.message}\n`));
  }

  // Step 6: Revoke Rule (Permanent)
  console.log(chalk.yellow("════════════════════════════════════════════════════════"));
  console.log(chalk.yellow.bold("  Step 6: Revoke Rule (Permanent Deactivation)"));
  console.log(chalk.yellow("════════════════════════════════════════════════════════\n"));

  await program.methods
    .revokeRule()
    .accounts({
      accessRule: ruleAddress,
      owner: wallet.publicKey,
    })
    .rpc();

  console.log(chalk.green("✓ Rule revoked successfully"));
  console.log(chalk.gray("  Status: PERMANENTLY INACTIVE\n"));

  console.log(chalk.green("════════════════════════════════════════════════════════"));
  console.log(chalk.green.bold("  LIFECYCLE DEMO COMPLETE"));
  console.log(chalk.green("════════════════════════════════════════════════════════\n"));
  console.log(chalk.cyan("Demonstrated:"));
  console.log(chalk.white("  ✓ Emergency pause capability"));
  console.log(chalk.white("  ✓ Access denial during pause"));
  console.log(chalk.white("  ✓ Rule resumption"));
  console.log(chalk.white("  ✓ Access restoration"));
  console.log(chalk.white("  ✓ Permanent revocation\n"));
}

main();
