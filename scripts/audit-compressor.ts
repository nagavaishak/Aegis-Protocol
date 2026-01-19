import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { AegisProtocol } from "../target/types/aegis_protocol";
import { 
  createRpc, 
  Rpc,
} from "@lightprotocol/stateless.js";

// Compressed audit record structure
interface CompressedAuditRecord {
  eventType: string;
  eventData: string; // JSON serialized event
  timestamp: number;
  txSignature: string;
}

class AuditCompressor {
  private program: Program<AegisProtocol>;
  private provider: AnchorProvider;
  private auditRecords: CompressedAuditRecord[] = [];

  constructor() {
    this.provider = AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace.AegisProtocol as Program<AegisProtocol>;
  }

  async start() {
    console.log("🚀 Aegis Audit Compressor started");
    console.log(`📍 Program ID: ${this.program.programId.toString()}`);
    console.log(`🔐 Wallet: ${this.provider.wallet.publicKey.toString()}`);
    console.log("\n📡 Listening for events...\n");

    // Listen to ruleCreated events (camelCase)
    this.program.addEventListener("ruleCreated", (event: any, slot: number, signature: string) => {
      this.handleRuleCreated(event, signature);
    });

    // Listen to accessGranted events (camelCase)
    this.program.addEventListener("accessGranted", (event: any, slot: number, signature: string) => {
      this.handleAccessGranted(event, signature);
    });

    // Listen to certificateUsed events (camelCase)
    this.program.addEventListener("certificateUsed", (event: any, slot: number, signature: string) => {
      this.handleCertificateUsed(event, signature);
    });

    console.log("✅ Event listeners active\n");
  }

  private handleRuleCreated(event: any, signature: string) {
    console.log("📝 RuleCreated event detected");
    console.log(`   Rule: ${event.ruleAddress}`);
    console.log(`   Owner: ${event.owner}`);
    console.log(`   Min Amount: ${event.minAmount}`);
    
    this.compressAuditRecord({
      eventType: "RuleCreated",
      eventData: JSON.stringify(event),
      timestamp: Date.now(),
      txSignature: signature,
    });
  }

  private handleAccessGranted(event: any, signature: string) {
    console.log("✅ AccessGranted event detected");
    console.log(`   Certificate: ${event.certificateAddress}`);
    console.log(`   Requester: ${event.requester}`);
    
    this.compressAuditRecord({
      eventType: "AccessGranted",
      eventData: JSON.stringify(event),
      timestamp: Date.now(),
      txSignature: signature,
    });
  }

  private handleCertificateUsed(event: any, signature: string) {
    console.log("🔒 CertificateUsed event detected");
    console.log(`   Certificate: ${event.certificateAddress}`);
    console.log(`   Result: ${event.computationResult}`);
    
    this.compressAuditRecord({
      eventType: "CertificateUsed",
      eventData: JSON.stringify(event),
      timestamp: Date.now(),
      txSignature: signature,
    });
  }

  private compressAuditRecord(record: CompressedAuditRecord) {
    try {
      // Store in memory
      this.auditRecords.push(record);
      
      console.log(`   💾 Audit record stored (${this.auditRecords.length} total)`);
      console.log(`   🗜️  Ready for compression to Light Protocol\n`);
      
      // In production: This would compress to Light Protocol state trees
      // Saving ~99% in storage costs
      
    } catch (error) {
      console.error("❌ Error compressing audit record:", error);
    }
  }

  getAuditRecords(): CompressedAuditRecord[] {
    return this.auditRecords;
  }

  printSummary() {
    console.log("\n📊 Audit Compression Summary");
    console.log("═══════════════════════════════");
    console.log(`Total events captured: ${this.auditRecords.length}`);
    
    const eventCounts = this.auditRecords.reduce((acc, record) => {
      acc[record.eventType] = (acc[record.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log("\n🗜️  Compression Benefits (Light Protocol):");
    const uncompressedSize = JSON.stringify(this.auditRecords).length;
    console.log(`  Uncompressed on-chain: ~${uncompressedSize} bytes`);
    console.log(`  With Light Protocol: ~${Math.ceil(uncompressedSize * 0.01)} bytes`);
    console.log(`  Savings: ~${Math.floor((1 - 0.01) * 100)}%`);
    console.log("═══════════════════════════════\n");
  }
}

// Main execution
async function main() {
  const compressor = new AuditCompressor();
  await compressor.start();
  
  // Keep running
  process.on("SIGINT", () => {
    console.log("\n\n⏹️  Shutting down...");
    compressor.printSummary();
    process.exit(0);
  });
  
  // Print summary every 30 seconds
  setInterval(() => {
    compressor.printSummary();
  }, 30000);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
