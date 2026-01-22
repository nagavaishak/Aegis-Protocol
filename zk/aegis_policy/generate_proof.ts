import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import circuit from './target/aegis_policy.json' assert { type: 'json' };
import fs from 'fs';

async function generateProof() {
  console.log("🔐 Aegis Protocol - Zero-Knowledge Proof Generation");
  console.log("=" .repeat(60));
  console.log("");

  // Initialize backend
  console.log("⚙️  Initializing Barretenberg backend...");
  const backend = new BarretenbergBackend(circuit);
  const noir = new Noir(circuit, backend);
  console.log("✅ Backend ready\n");

  // Prepare inputs
  const inputs = {
    secret_value: "150000",  // Private: never revealed
    commitment: "0x058c0d9b9a89a5b2525864c553e0ecbf45596b2165b88171e555372d7bff236d",  // Public: on-chain
    threshold: "100000"  // Public: on-chain policy
  };

  console.log("📝 Proof inputs:");
  console.log("   Secret value: 150000 (PRIVATE - never revealed)");
  console.log("   Commitment: 0x058c0...236d (PUBLIC - on-chain)");
  console.log("   Threshold: 100000 (PUBLIC - policy requirement)");
  console.log("");

  // Generate witness
  console.log("🔢 Computing witness...");
  const { witness } = await noir.execute(inputs);
  console.log("✅ Witness computed\n");

  // Generate proof
  console.log("🔐 Generating zero-knowledge proof...");
  const proof = await backend.generateProof(witness);
  console.log("✅ Proof generated!\n");

  // Save proof
  fs.writeFileSync('proof.json', JSON.stringify({
    proof: Array.from(proof.proof),
    publicInputs: proof.publicInputs
  }, null, 2));

  console.log("💾 Proof saved to: proof.json");
  console.log("   Proof size:", proof.proof.length, "bytes");
  console.log("");

  // Verify the proof
  console.log("🔎 Verifying proof...");
  const verified = await backend.verifyProof(proof);
  
  if (verified) {
    console.log("✅ Proof verification: VALID\n");
  } else {
    console.log("❌ Proof verification: INVALID\n");
    process.exit(1);
  }

  console.log("=" .repeat(60));
  console.log("🎉 Zero-Knowledge Proof Generation Complete!");
  console.log("=" .repeat(60));
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
}

generateProof().catch(console.error);
