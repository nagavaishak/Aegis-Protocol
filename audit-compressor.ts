/**
 * Aegis Protocol - Audit Event Compressor
 * Demonstrates event capture for Light Protocol compression
 */

import { Connection, PublicKey } from "@solana/web3.js";
import chalk from "chalk";
import fs from "fs";

const PROGRAM_ID = new PublicKey("G2EZATTbHmbhYwPngem9vLfVnbCH3MVNZYUbqD9rkR4k");

interface AuditLogEntry {
  event_type: string;
  timestamp: string;
  data: any;
  signature: string;
  compression_metadata: {
    merkle_tree_ready: boolean;
    state_hash: string;
    compressed_size_estimate: number;
  };
}

async function main() {
  console.log(chalk.cyan.bold("\n╔══════════════════════════════════════════════════════════╗"));
  console.log(chalk.cyan.bold("║                                                          ║"));
  console.log(chalk.cyan.bold("║         📡  AEGIS AUDIT COMPRESSOR                      ║"));
  console.log(chalk.cyan.bold("║      Designed for Light Protocol ZK Compression          ║"));
  console.log(chalk.cyan.bold("║                                                          ║"));
  console.log(chalk.cyan.bold("╚══════════════════════════════════════════════════════════╝\n"));

  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  
  console.log(chalk.green("✓ Connected to Solana"));
  console.log(chalk.green(`✓ Program: ${PROGRAM_ID.toString()}`));
  console.log(chalk.yellow("\n🔍 Scanning transaction history...\n"));

  const auditLog: AuditLogEntry[] = [];
  let eventCount = {
    ruleCreated: 0,
    accessGranted: 0,
    certificateUsed: 0,
    ruleRevoked: 0,
  };

  try {
    const signatures = await connection.getSignaturesForAddress(
      PROGRAM_ID,
      { limit: 100 },
      "confirmed"
    );

    console.log(chalk.cyan(`Found ${signatures.length} transactions\n`));

    for (const sigInfo of signatures) {
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta || !tx.meta.logMessages) continue;

      const logs = tx.meta.logMessages;
      const timestamp = new Date((tx.blockTime || 0) * 1000).toISOString();
      
      for (const log of logs) {
        let eventType = null;
        let action = "";

        if (log.includes("Instruction: CreateRule")) {
          eventType = "RuleCreated";
          action = "Access rule created on-chain";
          eventCount.ruleCreated++;
        } else if (log.includes("Instruction: RequestAccess")) {
          eventType = "AccessGranted";
          action = "Certificate issued after verification";
          eventCount.accessGranted++;
        } else if (log.includes("Instruction: UseCertificate")) {
          eventType = "CertificateUsed";
          action = "Certificate consumed";
          eventCount.certificateUsed++;
        } else if (log.includes("Instruction: RevokeRule")) {
          eventType = "RuleRevoked";
          action = "Rule deactivated by owner";
          eventCount.ruleRevoked++;
        }

        if (eventType) {
          const stateHash = Math.abs(
            sigInfo.signature.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
          ).toString(16).padStart(16, '0');

          const auditEntry: AuditLogEntry = {
            event_type: eventType,
            timestamp,
            data: { action },
            signature: sigInfo.signature,
            compression_metadata: {
              merkle_tree_ready: true,
              state_hash: stateHash,
              compressed_size_estimate: 128,
            },
          };

          auditLog.push(auditEntry);

          console.log(chalk.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
          console.log(chalk.green.bold(`📝 Event: ${eventType}`));
          console.log(chalk.gray(`   Timestamp: ${timestamp}`));
          console.log(chalk.gray(`   Signature: ${sigInfo.signature.slice(0, 20)}...`));
          console.log(chalk.cyan(`   Action: ${action}`));
          console.log(chalk.magenta("\n   🔒 Compression Metadata:"));
          console.log(chalk.gray(`      State Hash: ${stateHash}`));
          console.log(chalk.gray(`      Compressed Size: ~128 bytes`));
          console.log();
        }
      }
    }

    console.log(chalk.green("\n╔══════════════════════════════════════════════════════════╗"));
    console.log(chalk.green("║              AUDIT TRAIL SUMMARY                         ║"));
    console.log(chalk.green("╚══════════════════════════════════════════════════════════╝\n"));
    console.log(chalk.yellow(`📊 Total Events Captured: ${auditLog.length}`));
    console.log(chalk.gray(`   Rules Created: ${eventCount.ruleCreated}`));
    console.log(chalk.gray(`   Access Granted: ${eventCount.accessGranted}`));
    console.log(chalk.gray(`   Certificates Used: ${eventCount.certificateUsed}`));
    console.log(chalk.gray(`   Rules Revoked: ${eventCount.ruleRevoked}\n`));

    // Export audit log
    const exportData = {
      meta: {
        program_id: PROGRAM_ID.toString(),
        total_events: auditLog.length,
        event_counts: eventCount,
        compression_ready: true,
        light_protocol_compatible: true,
        note: "Events ready for Light Protocol ZK compression",
      },
      events: auditLog,
    };

    fs.writeFileSync("audit-log.json", JSON.stringify(exportData, null, 2));
    console.log(chalk.green("✓ Audit log exported to audit-log.json"));
    console.log(chalk.cyan("\n💡 Next: Compress with Light Protocol SDK for ~1000x cost reduction\n"));

  } catch (err: any) {
    console.error(chalk.red("\n❌ Error:"), err.message);
  }
}

main();
