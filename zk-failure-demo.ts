import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import fs from "fs";

const circuit = JSON.parse(fs.readFileSync('./zk/aegis_policy/target/aegis_policy.json', 'utf-8'));

console.log("\n" + "=".repeat(70));
console.log("🔐 AEGIS ZK PROOF - FAILURE CASE DEMONSTRATION");
console.log("=".repeat(70) + "\n");

async function main() {
  console.log("📋 Scenario: Secret does NOT meet policy requirements");
  console.log("-".repeat(70));
  
  const secretValue = 50000; // BELOW threshold of 100000
  const commitment = "0x058c0d9b9a89a5b2525864c553e0ecbf45596b2165b88171e555372d7bff236d";
  const threshold = 100000;
  
  console.log("   Policy requirement: secret >= 100000");
  console.log("   Actual secret: 50000");
  console.log("   Result: Should FAIL ❌\n");
  
  console.log("🔐 Attempting to generate proof...");
  console.log("-".repeat(70));
  
  const backend = new BarretenbergBackend(circuit);
  const noir = new Noir(circuit, backend);
  await noir.init();
  
  const zkInputs = {
    secret_value: secretValue.toString(),
    commitment: commitment,
    threshold: threshold.toString()
  };
  
  try {
    console.log("   Computing witness...");
    const { witness } = await noir.execute(zkInputs);
    
    console.log("   ❌ ERROR: Witness should have failed!");
    console.log("   (Secret 50000 < threshold 100000)\n");
    await backend.destroy();
    process.exit(1);
    
  } catch (error: any) {
    console.log("   ✅ EXPECTED: Witness generation FAILED");
    console.log("   Reason:", error.message);
    console.log("");
  }
  
  await backend.destroy();
  
  console.log("=".repeat(70));
  console.log("🛡️  PRIVACY ENFORCEMENT DEMONSTRATED");
  console.log("=".repeat(70));
  console.log("");
  console.log("✅ What happened:");
  console.log("   • Secret (50000) did NOT meet threshold (100000)");
  console.log("   • ZK circuit REJECTED the proof attempt");
  console.log("   • No valid proof was generated");
  console.log("   • Aegis would NOT issue a certificate");
  console.log("");
  console.log("🔒 Privacy preserved:");
  console.log("   • The system can say NO");
  console.log("   • Invalid secrets are detected cryptographically");
  console.log("   • No certificate = No access");
  console.log("");
  console.log("🏆 This demonstrates:");
  console.log("   Real enforcement, not just happy-path demos!");
  console.log("");
}

main().catch(console.error);
