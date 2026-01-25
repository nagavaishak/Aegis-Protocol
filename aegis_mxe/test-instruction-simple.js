const anchor = require("@coral-xyz/anchor");
const fs = require("fs");
const os = require("os");

async function test() {
  process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
  process.env.ANCHOR_WALLET = `${os.homedir()}/.config/solana/id.json`;
  
  anchor.setProvider(anchor.AnchorProvider.env());
  
  const idl = JSON.parse(fs.readFileSync("./target/idl/aegis_mxe_deploy.json"));
  const programId = new anchor.web3.PublicKey(idl.address);
  const program = new anchor.Program(idl, programId);
  
  console.log("Program loaded");
  console.log("Available methods:", Object.keys(program.methods));
  
  // Try to call verifyAccess with minimal args
  try {
    const builder = program.methods.verifyAccess(
      new anchor.BN(0), // computationOffset
      Array(32).fill(0), // encrypted_amount  
      new anchor.BN(100000), // threshold
      Array(32).fill(0), // pubkey
      new anchor.BN(0) // nonce
    );
    console.log("✅ Method builder created successfully");
    console.log("Builder type:", typeof builder);
  } catch (e) {
    console.log("❌ Failed to create method builder:", e.message);
  }
}

test().catch(console.error);
