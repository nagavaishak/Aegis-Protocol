import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AegisMxeDeploy } from "../target/types/aegis_mxe_deploy";
import { randomBytes } from "crypto";
import {
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  buildFinalizeCompDefTx,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getMXEPublicKey,
  RescueCipher,
  deserializeLE,
  x25519,
  ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
  ARCIUM_CLOCK_ACCOUNT_ADDRESS,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";

describe("AegisMxeDeploy", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.AegisMxeDeploy as Program<AegisMxeDeploy>;
  const provider = anchor.getProvider();

  const arciumEnv = getArciumEnv();

  it("MXE verify_access works!", async () => {
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    console.log("Initializing verify_access computation definition");
    const initSig = await initVerifyAccessCompDef(program, owner);
    console.log("Init sig:", initSig);

    console.log("Waiting for MXE keys...");
    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId,
      30,
      2000
    );
    console.log("✅ MXE keys are ready!");

    // Setup encryption
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    // Encrypt amount: 150000 (should pass threshold of 100000)
    const secretAmount = BigInt(150000);
    const threshold = new anchor.BN(100000);
    
    const nonce = randomBytes(16);
    const ciphertext = cipher.encrypt([secretAmount], nonce);

    const computationOffset = new anchor.BN(randomBytes(8), "hex");
    console.log("Using computation offset:", computationOffset.toString());

    console.log("Building instruction with encrypted amount...");
    
    const ix = await program.methods
      .verifyAccess(
        computationOffset,
        Array.from(ciphertext[0]),
        threshold,
        Array.from(publicKey),
        new anchor.BN(deserializeLE(nonce).toString())
      )
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
    
    console.log("✅ Instruction built!");
    
    const tx = new Transaction().add(ix);
    const sig = await provider.sendAndConfirm(tx, [owner]);
    console.log("🎉 MXE COMPUTATION QUEUED! Signature:", sig);
    console.log("Secret amount: 150000, Threshold: 100000 - Should approve!");
  });

  async function initVerifyAccessCompDef(
    program: Program<AegisMxeDeploy>,
    owner: anchor.web3.Keypair,
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("verify_access");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgramId(),
    )[0];

    const sig = await program.methods
      .initVerifyAccessCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    const finalizeTx = await buildFinalizeCompDefTx(
      provider as anchor.AnchorProvider,
      Buffer.from(offset).readUInt32LE(),
      program.programId,
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
    finalizeTx.sign(owner);
    await provider.sendAndConfirm(finalizeTx);
    
    return sig;
  }
  
  async function getMXEPublicKeyWithRetry(
    provider: anchor.AnchorProvider,
    programId: PublicKey,
    maxRetries: number = 30,
    retryDelayMs: number = 2000,
  ): Promise<Uint8Array> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const mxePublicKey = await getMXEPublicKey(provider, programId);
        if (mxePublicKey) return mxePublicKey;
      } catch (error) {
        console.log(`Attempt ${attempt}/${maxRetries} - MXE not ready yet`);
      }
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
    throw new Error(`MXE keys not set after ${maxRetries} attempts`);
  }
});

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())));
}
