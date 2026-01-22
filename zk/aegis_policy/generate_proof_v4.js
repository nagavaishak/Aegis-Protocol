const { BarretenbergBackend } = require('@noir-lang/backend_barretenberg');
const { Noir } = require('@noir-lang/noir_js');
const circuit = require('./target/aegis_policy.json');
const fs = require('fs');

async function generateProof() {
  console.log("🔐 Aegis Protocol - Zero-Knowledge Proof Generation");
  console.log("=".repeat(60));
  console.log("");

  let backend;
  
  try {
    // Initialize
    console.log("⚙️  Initializing backend and Noir instance...");
    backend = new BarretenbergBackend(circuit);
    const noir = new Noir(circuit, backend);
    await noir.init();
    console.log("✅ Ready\n");

    // Prepare inputs
    const inputs = {
      secret_value: "150000",
      commitment: "0x058c0d9b9a89a5b2525864c553e0ecbf45596b2165b88171e555372d7bff236d",
      threshold: "100000"
    };

    console.log("📝 Inputs:");
    console.log("   Secret: 150000 (PRIVATE)");
    console.log("   Commitment: 0x058c0...236d (PUBLIC)");
    console.log("   Threshold: 100000 (PUBLIC)");
    console.log("");

    // Step 1: Execute circuit to get witness
    console.log("🔢 Computing witness...");
    const { witness } = await noir.execute(inputs);
    console.log("✅ Witness computed\n");

    // Step 2: Generate proof from witness
    console.log("🔐 Generating zero-knowledge proof...");
    const proof = await backend.generateProof(witness);
    console.log("✅ Proof generated!\n");

    // Save proof
    const proofData = {
      proof: Array.from(proof.proof),
      publicInputs: proof.publicInputs ? Array.from(proof.publicInputs).map(x => x.toString()) : []
    };
    
    fs.writeFileSync('proof.json', JSON.stringify(proofData, null, 2));

    console.log("💾 Saved to: proof.json");
    console.log("   Size:", proof.proof.length, "bytes\n");

    // Step 3: Verify
    console.log("🔎 Verifying proof...");
    const verified = await backend.verifyProof(proof);
    
    if (verified) {
      console.log("✅ VALID\n");
    } else {
      console.log("❌ INVALID\n");
      await backend.destroy();
      process.exit(1);
    }

    console.log("=".repeat(60));
    console.log("🎉 Zero-Knowledge Proof Complete!");
    console.log("=".repeat(60));
    console.log("");
    console.log("📊 What was proven:");
    console.log("   ✓ Secret hashes to commitment");
    console.log("   ✓ Secret meets threshold");
    console.log("   ✗ Secret value NEVER revealed");
    console.log("");

    // Cleanup
    await backend.destroy();
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (backend) await backend.destroy();
    process.exit(1);
  }
}

generateProof().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
