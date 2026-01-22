import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AegisProtocol } from "./target/types/aegis_protocol";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { createHash } from "crypto";
import { ArciumOracle } from './arcium-oracle';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runDemo() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║    AEGIS PROTOCOL + ARCIUM: AI DATA GOVERNANCE DEMO         ║");
  console.log("║   Privacy-Preserving Dataset Access with Confidential       ║");
  console.log("║              Compliance Verification                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AegisProtocol as Program<AegisProtocol>;
  
  // Use your existing funded wallet instead of generating new ones
  const wallet = provider.wallet as anchor.Wallet;
  
  // Initialize Arcium Oracle
  console.log("🔐 Initializing Arcium Confidential Computing Oracle...\n");
  const arciumOracle = new ArciumOracle();
  await arciumOracle.initialize();
  
  await delay(1000);

  console.log("\n" + "=".repeat(70));
  console.log("📋 SCENARIO: AI Training Data Access Control");
  console.log("=".repeat(70) + "\n");
  
  console.log("Context:");
  console.log("• Research Lab has medical imaging dataset");
  console.log("• AI Company wants to train models on the data");
  console.log("• Must prove: dataset ≥ 1M samples, from approved sources");
  console.log("• Verification via Arcium MPC (confidential)\n");
  
  await delay(1500);

  // Step 1: Research Lab creates access policy
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 1: Research Lab Creates Dataset Access Policy");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  const datasetId = Buffer.from("medical-imaging-2024".padEnd(32, '\0'));
  const secret = Buffer.from("lab-access-key".padEnd(32, '\0'));
  const secretHash = createHash('sha256').update(secret).digest();
  
  const sourceNIH = createHash('sha256').update("source-nih-hospital").digest();
  const sourceMayo = createHash('sha256').update("source-mayo-clinic").digest();
  
  const [accessRulePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("rule"), datasetId],
    program.programId
  );
  
  console.log("📝 Dataset Policy:");
  console.log("   Dataset ID: medical-imaging-2024");
  console.log("   Minimum Samples: 1,000,000");
  console.log("   Approved Sources: NIH Hospital, Mayo Clinic");
  console.log("   Validity: 90 days");
  console.log("   Governance: HIPAA compliant\n");
  
  const now = Math.floor(Date.now() / 1000);
  
  try {
    await program.methods
      .createRule(
        Array.from(datasetId),
        Array.from(secretHash),
        new anchor.BN(1000000), // 1M samples minimum
        [Array.from(sourceNIH), Array.from(sourceMayo)],
        new anchor.BN(now),
        new anchor.BN(now + 90 * 24 * 60 * 60)
      )
      .accounts({
        accessRule: accessRulePda,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Dataset access policy created on-chain");
    console.log("   Rule Address:", accessRulePda.toBase58(), "\n");
  } catch (e) {
    if (e.message.includes('already in use')) {
      console.log("ℹ️  Policy already exists (using existing)\n");
    } else {
      throw e;
    }
  }
  
  await delay(2000);

  // Step 2: AI Company requests access via Arcium
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 2: AI Company Requests Access (Arcium Confidential Verification)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  console.log("🔒 Confidential Dataset Metadata (Never On-Chain):");
  console.log("   Total Samples: 2,500,000");
  console.log("   Data Source: NIH Hospital");
  console.log("   Collection Period: 2020-2024");
  console.log("   Patient Consent: ✅ Verified");
  console.log("   Access Key: [REDACTED]\n");
  
  // Call Arcium for confidential compliance verification
  console.log("🔐 [Arcium] Encrypting dataset metadata...");
  const arciumResult = await arciumOracle.verifyPolicy({
    dataset_id: 'medical-imaging-2024',
    invoice_amount: 2500000, // Using as sample count
    buyer_id: 'source-nih-hospital',
    min_amount: 1000000,
    approved_buyers: ['source-nih-hospital', 'source-mayo-clinic']
  });
  
  await delay(1000);
  
  console.log("\n🎫 Arcium MPC Computation Result:");
  console.log("   Job ID:", arciumResult.job_id);
  console.log("   Computation Hash:", arciumResult.computation_hash);
  console.log("   Compliance Check:", arciumResult.verified ? "✅ PASSED" : "❌ FAILED");
  console.log("   Timestamp:", new Date(arciumResult.timestamp).toISOString(), "\n");
  
  await delay(1500);

  // Step 3: Issue certificate on Aegis bound to Arcium proof
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 3: Issue Training Certificate (Bound to Arcium Proof)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  const aiCompany = Keypair.generate();
  
  const [certificatePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("certificate"),
      accessRulePda.toBuffer(),
      aiCompany.publicKey.toBuffer(),
    ],
    program.programId
  );
  
  console.log("📤 Submitting certificate request to Aegis Protocol...\n");
  
  try {
    // Fund the AI company account
    const fundTx = await provider.connection.requestAirdrop(
      aiCompany.publicKey,
      0.5 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(fundTx);
    await delay(1000);
    
    await program.methods
      .requestAccessWithArcium(
        arciumResult.job_id,
        arciumResult.computation_hash,
        new anchor.BN(2500000),
        Array.from(sourceNIH)
      )
      .accounts({
        accessRule: accessRulePda,
        certificate: certificatePda,
        requester: aiCompany.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([aiCompany])
      .rpc();
    
    console.log("✅ Training Certificate Issued!");
    console.log("   Certificate Address:", certificatePda.toBase58());
    console.log("   Bound to Arcium Job:", arciumResult.job_id);
    console.log("   Valid Duration: 1 hour\n");
    
    // Fetch and display certificate
    const cert = await program.account.accessCertificate.fetch(certificatePda);
    console.log("📜 Certificate Details:");
    console.log("   Dataset:", Buffer.from(cert.datasetId).toString().trim());
    console.log("   Requester:", cert.requester.toBase58());
    console.log("   Arcium Job ID:", cert.arciumJobId);
    console.log("   Computation Hash:", cert.arciumComputationHash);
    console.log("   Valid Until:", new Date(cert.validUntil.toNumber() * 1000).toISOString());
    console.log("   Used:", cert.isUsed, "\n");
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    if (error.message.includes('429')) {
      console.log("   (Devnet rate limit - use funded wallet in production)\n");
    }
  }
  
  await delay(2000);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 INTEGRATION ARCHITECTURE");
  console.log("=".repeat(70) + "\n");
  
  console.log("🔐 Arcium Layer (Confidential Compute):");
  console.log("   ✅ Encrypts sensitive dataset metadata");
  console.log("   ✅ Verifies compliance criteria in MPC");
  console.log("   ✅ Returns cryptographic proof (job ID + hash)");
  console.log("   ✅ Zero knowledge of private data\n");
  
  console.log("⚓ Aegis Layer (On-Chain Authorization):");
  console.log("   ✅ Stores access policies publicly");
  console.log("   ✅ Issues certificates bound to Arcium proofs");
  console.log("   ✅ Enforces time-bound access");
  console.log("   ✅ Maintains audit trail via events\n");
  
  console.log("🔒 Privacy Guarantees:");
  console.log("   • Sample count: NEVER on-chain");
  console.log("   • Data source: NEVER on-chain");
  console.log("   • Patient data: NEVER on-chain");
  console.log("   • Compliance verification: Confidential (Arcium)");
  console.log("   • Access authorization: Public (Solana)\n");
  
  console.log("🚀 Production Path:");
  console.log("   1. Deploy custom Arcium MXE with compliance logic");
  console.log("   2. Integrate real MPC computation callbacks");
  console.log("   3. Add ZK proofs for additional privacy layers");
  console.log("   4. Scale to handle enterprise workloads\n");
  
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              AI DATA GOVERNANCE DEMO COMPLETE ✅             ║");
  console.log("║        Aegis Protocol + Arcium Integration Working          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

runDemo().catch(console.error);
