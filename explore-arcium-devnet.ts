import { Connection, PublicKey } from '@solana/web3.js';
import { getArciumEnv, getArciumProgramId } from '@arcium-hq/client';

async function exploreArcium() {
  console.log('🔍 Exploring Arcium on Devnet...\n');
  
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Get Arcium program ID
  const arciumProgramId = getArciumProgramId();
  console.log('Arcium Program ID:', arciumProgramId.toBase58());
  
  // Check if program exists
  try {
    const accountInfo = await connection.getAccountInfo(arciumProgramId);
    if (accountInfo) {
      console.log('✅ Arcium program found on devnet!');
      console.log('Owner:', accountInfo.owner.toBase58());
      console.log('Executable:', accountInfo.executable);
    } else {
      console.log('❌ Arcium program not found on devnet');
    }
  } catch (e) {
    console.log('Error checking program:', e.message);
  }
  
  // Check cluster offset from env
  const env = getArciumEnv();
  console.log('\nCluster Offset:', env.arciumClusterOffset);
}

exploreArcium().catch(console.error);
