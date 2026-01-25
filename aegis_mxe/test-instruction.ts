import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AegisMxeDeploy } from "./target/types/aegis_mxe_deploy.js";
import { randomBytes } from "crypto";
import {
  getArciumEnv,
  getCompDefAccOffset,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
  ARCIUM_CLOCK_ACCOUNT_ADDRESS,
  getArciumProgramId,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";

anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.AegisMxeDeploy as Program<AegisMxeDeploy>;

const arciumEnv = getArciumEnv();
const owner = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`).toString()))
);

const computationOffset = new anchor.BN(randomBytes(8), "hex");
const threshold = new anchor.BN(100000);
const encryptedAmount = Array.from(randomBytes(32));
const pubkey = Array.from(randomBytes(32));
const nonce = new anchor.BN(randomBytes(16).toString("hex"), "hex");

console.log("Attempting to build instruction...");

try {
  const ix = await program.methods
    .verifyAccess(computationOffset, encryptedAmount, threshold, pubkey, nonce)
    .accounts({
      payer: owner.publicKey,
      signPdaAccount: PublicKey.findProgramAddressSync(
        [Buffer.from("ArciumSignerAccount")],
        program.programId
      )[0],
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
      executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
      computationAccount: getComputationAccAddress(arciumEnv.arciumClusterOffset, computationOffset),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("verify_access")).readUInt32LE(),
      ),
      clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
      poolAccount: ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
      clockAccount: ARCIUM_CLOCK_ACCOUNT_ADDRESS,
      systemProgram: SystemProgram.programId,
      arciumProgram: getArciumProgramId(),
    })
    .instruction();
  
  console.log("✅ SUCCESS! Instruction built:");
  console.log("Program ID:", ix.programId.toString());
  console.log("Keys:", ix.keys.length);
  console.log("Data length:", ix.data.length);
} catch (error) {
  console.log("❌ FAILED to build instruction:");
  console.log(error);
}
