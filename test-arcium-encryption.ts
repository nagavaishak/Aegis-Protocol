import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
  getArciumEnv, 
  getArciumProgramId,
  encryptInputs,
  createSharedSecret
} from '@arcium-hq/client';
import * as anchor from '@coral-xyz/anchor';

async function testArciumFlow() {
  console.log('🔐 Testing Arcium Encryption Flow...\n');
  
  // Setup
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const userKeypair = Keypair.generate();
  const env = getArciumEnv();
  
  console.log('User Pubkey:', userKeypair.publicKey.toBase58());
  console.log('Arcium Program:', getArciumProgramId().toBase58());
  console.log('Cluster Offset:', env.arciumClusterOffset);
  
  // Try to understand the encryption API
  console.log('\n📚 Available Arcium Client Functions:');
  
  try {
    // This is just to see what's available in the SDK
    const client = require('@arcium-hq/client');
    console.log('Exported functions:', Object.keys(client).filter(k => typeof client[k] === 'function'));
  } catch (e) {
    console.log('Error exploring SDK:', e.message);
  }
}

testArciumFlow().catch(console.error);
