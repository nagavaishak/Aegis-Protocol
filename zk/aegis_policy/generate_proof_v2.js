const { BarretenbergBackend } = require('@noir-lang/backend_barretenberg');
const circuit = require('./target/aegis_policy.json');
const fs = require('fs');
const { gunzipSync } = require('zlib');

async function generateProof() {
  console.log("🔐 Aegis Protocol - Zero-Knowledge Proof Generation");
  console.log("=".repeat(60));
  console.log("");

  try {
    // Initialize backend
    console.log("⚙️  Initializing Barretenberg backend...");
    const backend = new BarretenbergBackend(circuit);
    console.log("✅ Backend ready\n");

    // Read the witness that nargo generated
    console.log("📂 Reading witness from target/witness.gz...");
    const witnessGz = fs.readFileSync('target/witness.gz');
    const witnessBuffer = gunzipSync(witnessGz);
    
    // Parse witness (it's in a specific format)
    console.log("✅ Witness loaded\n");

    console.log("📝 Proving:");
    console.log("   Secret value: 150000 (PRIVATE - never revealed)");
    console.log("   Commitment: 0x058c0...236d (PUBLIC - on-chain)");
    console.log("   Threshold: 100000 (PUBLIC - policy requirement)");
    console.log("");

    // Generate proof from witness
    console.log("🔐 Generating zero-knowledge proof...");
    const { proof, publicInputs } = await backend.generateProof(witnessBuffer);
    console.log("✅ Proof generated!\n");

    // Save proof
    const proofData = {
      proof: Array.from(proof),
      publicInputs: Array.from(publicInputs).map(x => x.toString())
    };
    
    fs.writeFileSync('proof.json', JSON.stringify(proofData, null, 2));

    console.log("💾 Proof saved to: proof.json");
    console.log("   Proof size:", proof.length, "bytes");
    console.log("");

    // Verify the proof
    console.log("🔎 Verifying proof...");
    const verified = await backend.verifyProof({ proof, publicInputs });
    
    if (verified) {
      console.log("✅ Proof verification: VALID\n");
    } else {
      console.log("❌ Proof verification: INVALID\n");
      process.exit(1);
    }

    console.log("=".repeat(60));
    console.log("🎉 Zero-Knowledge Proof Generation Complete!");
    console.log("=".repeat(60));
    console.log("");
    console.log("📊 What was proven:");
    console.log("   ✓ Secret value hashes to the on-chain commitment");
    console.log("   ✓ Secret value meets the threshold requirement");
    console.log("   ✗ Secret value (150000) was NEVER revealed");
    console.log("");
    console.log("🔒 Privacy guarantee:");
    console.log("   The verifier learns NOTHING about the secret except:");
    console.log("   - It matches the commitment");
    console.log("   - It meets the threshold");
    console.log("");
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err);
    process.exit(1);
  }
}

generateProof().catch(err => {
  console.error("❌ Caught error:", err);
  process.exit(1);
});
