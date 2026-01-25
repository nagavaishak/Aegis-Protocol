const anchor = require("@coral-xyz/anchor");
const { SystemProgram, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const os = require("os");
const arcium = require("@arcium-hq/client");

async function test() {
  process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
  process.env.ANCHOR_WALLET = `${os.homedir()}/.config/solana/id.json`;
  
  anchor.setProvider(anchor.AnchorProvider.env());
  
  const idl = JSON.parse(fs.readFileSync("./target/idl/aegis_mxe_deploy.json"));
  const programId = new PublicKey(idl.address);
  const program = new anchor.Program(idl, programId);
  
  const owner = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`)))
  );
  
  const arciumEnv = arcium.getArciumEnv();
  const computationOffset = new anchor.BN(0);
  
  console.log("Building with accounts...");
  
  try {
    const ix = await program.methods
      .verifyAccess(
        computationOffset,
        Array(32).fill(0),
        new anchor.BN(100000),
        Array(32).fill(0),
        new anchor.BN(0)
      )
      .accounts({
        payer: owner.publicKey,
        signPdaAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("ArciumSignerAccount")],
          programId
        )[0],
        mxeAccount: arcium.getMXEAccAddress(programId),
        mempoolAccount: arcium.getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: arcium.getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        computationAccount: arcium.getComputationAccAddress(arciumEnv.arciumClusterOffset, computationOffset),
        compDefAccount: arcium.getCompDefAccAddress(
          programId,
          Buffer.from(arcium.getCompDefAccOffset("verify_access")).readUInt32LE()
        ),
        clusterAccount: arcium.getClusterAccAddress(arciumEnv.arciumClusterOffset),
        poolAccount: arcium.ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
        clockAccount: arcium.ARCIUM_CLOCK_ACCOUNT_ADDRESS,
        systemProgram: SystemProgram.programId,
        arciumProgram: arcium.getArciumProgramId(),
      })
      .instruction();
    
    console.log("✅ Instruction built successfully!");
    console.log("Keys:", ix.keys.length);
  } catch (e) {
    console.log("❌ Failed:", e.message);
    console.log("Full error:", e);
  }
}

test().catch(console.error);
