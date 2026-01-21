import { Connection, PublicKey } from "@solana/web3.js";
import chalk from "chalk";

const PROGRAM_ID = new PublicKey("G2EZATTbHmbhYwPngem9vLfVnbCH3MVNZYUbqD9rkR4k");

async function main() {
  console.log(chalk.cyan.bold("\n╔══════════════════════════════════════════════════════════╗"));
  console.log(chalk.cyan.bold("║                                                          ║"));
  console.log(chalk.cyan.bold("║     📊  AEGIS PROTOCOL - ACCESS METRICS                 ║"));
  console.log(chalk.cyan.bold("║                                                          ║"));
  console.log(chalk.cyan.bold("╚══════════════════════════════════════════════════════════╝\n"));

  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 100 }, "confirmed");

  let metrics = {
    totalAttempts: 0,
    accessGranted: 0,
    accessDenied: 0,
    rulesCreated: 0,
    rulesPaused: 0,
    rulesResumed: 0,
    rulesRevoked: 0,
    avgInvoiceAmount: 0,
    totalInvoiceAmount: 0,
    uniqueRequesters: new Set<string>(),
  };

  console.log(chalk.yellow("🔍 Analyzing transaction history...\n"));

  for (const sigInfo of signatures) {
    const tx = await connection.getTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || !tx.meta.logMessages) continue;

    const logs = tx.meta.logMessages;

    for (const log of logs) {
      if (log.includes("Instruction: CreateRule")) {
        metrics.rulesCreated++;
      } else if (log.includes("Instruction: RequestAccess")) {
        metrics.totalAttempts++;
        // Check if it succeeded
        if (tx.meta.err === null) {
          metrics.accessGranted++;
        } else {
          metrics.accessDenied++;
        }
      } else if (log.includes("Instruction: PauseRule")) {
        metrics.rulesPaused++;
      } else if (log.includes("Instruction: ResumeRule")) {
        metrics.rulesResumed++;
      } else if (log.includes("Instruction: RevokeRule")) {
        metrics.rulesRevoked++;
      }
    }
  }

  const successRate = metrics.totalAttempts > 0 
    ? ((metrics.accessGranted / metrics.totalAttempts) * 100).toFixed(1)
    : "0.0";

  console.log(chalk.green("════════════════════════════════════════════════════════"));
  console.log(chalk.green.bold("  ACCESS CONTROL METRICS"));
  console.log(chalk.green("════════════════════════════════════════════════════════\n"));

  console.log(chalk.cyan("📊 Access Attempts:"));
  console.log(chalk.white(`   Total: ${metrics.totalAttempts}`));
  console.log(chalk.green(`   ✓ Granted: ${metrics.accessGranted}`));
  console.log(chalk.red(`   ✗ Denied: ${metrics.accessDenied}`));
  console.log(chalk.yellow(`   Success Rate: ${successRate}%\n`));

  console.log(chalk.cyan("🔧 Policy Management:"));
  console.log(chalk.white(`   Rules Created: ${metrics.rulesCreated}`));
  console.log(chalk.yellow(`   Rules Paused: ${metrics.rulesPaused}`));
  console.log(chalk.green(`   Rules Resumed: ${metrics.rulesResumed}`));
  console.log(chalk.red(`   Rules Revoked: ${metrics.rulesRevoked}\n`));

  console.log(chalk.green("════════════════════════════════════════════════════════\n"));
  console.log(chalk.gray("💡 All metrics calculated from on-chain events"));
  console.log(chalk.gray("   No additional state storage required\n"));
}

main();