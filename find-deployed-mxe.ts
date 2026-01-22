import { Connection, PublicKey } from '@solana/web3.js';
import { getMXEAccAddress, getArciumProgramId } from '@arcium-hq/client';

async function findMXEs() {
  console.log('🔍 Searching for deployed MXEs on devnet...\n');
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const arciumProgram = getArciumProgramId();
  
  console.log('Arcium Program:', arciumProgram.toBase58());
  
  // Known example program IDs from search results
  const testProgramIds = [
    'DmthLucwUx2iM7VoFUv14PHfVqfqGxHKLMVXzUb8vvMm', // Poker example from GitHub
    'HN5kJdetDoQr65H8Ax3QowxaXapzfk6FXiXrZbkR9DET', // From coinflip sync output
  ];
  
  console.log('\n📋 Checking known program IDs for MXE accounts...\n');
  
  for (const programIdStr of testProgramIds) {
    try {
      const programId = new PublicKey(programIdStr);
      console.log(`\n🔍 Checking program: ${programIdStr}`);
      
      // Check if program exists
      const programInfo = await connection.getAccountInfo(programId);
      if (!programInfo) {
        console.log('  ❌ Program not found on devnet');
        continue;
      }
      
      console.log('  ✅ Program exists!');
      console.log('  Owner:', programInfo.owner.toBase58());
      
      // Try to derive MXE account address
      const mxeAddress = getMXEAccAddress(programId);
      console.log('  MXE Address:', mxeAddress.toBase58());
      
      // Check if MXE account exists
      const mxeInfo = await connection.getAccountInfo(mxeAddress);
      if (mxeInfo) {
        console.log('  ✅ MXE ACCOUNT FOUND!');
        console.log('  Size:', mxeInfo.data.length, 'bytes');
        console.log('  Owner:', mxeInfo.owner.toBase58());
        
        console.log('\n  🎯 THIS MXE CAN POTENTIALLY BE USED!');
      } else {
        console.log('  ⚠️  MXE account not initialized');
      }
      
    } catch (e) {
      console.log('  ❌ Error:', e.message);
    }
  }
  
  console.log('\n\n💡 Next Steps:');
  console.log('1. If MXE found → Try to fetch its public key');
  console.log('2. If none found → Build with SDK simulation (recommended)');
  console.log('3. Either way → We have the architecture ready');
}

findMXEs().catch(console.error);
