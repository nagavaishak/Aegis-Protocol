import { Connection, Keypair } from '@solana/web3.js';
import { 
  getMXEPublicKey,
  RescueCipher,
  x25519,
  getArciumEnv
} from '@arcium-hq/client';
import { randomBytes } from 'crypto';
import * as anchor from '@coral-xyz/anchor';

async function testArciumEncryption() {
  console.log('🔐 Testing Complete Arcium Encryption Flow...\n');
  
  try {
    // Setup connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const wallet = Keypair.generate();
    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(wallet),
      { commitment: 'confirmed' }
    );
    
    // Get Arcium environment
    const arciumEnv = getArciumEnv();
    console.log('Cluster Offset:', arciumEnv.arciumClusterOffset);
    
    // For this test, we need a deployed MXE program ID
    // Let's use a placeholder - in reality you'd have your deployed program
    const testProgramId = Keypair.generate().publicKey;
    console.log('\n📋 Test Program ID:', testProgramId.toBase58());
    
    // Try to get MXE public key (this will likely fail without deployed MXE)
    console.log('\n🔑 Attempting to fetch MXE public key...');
    const mxePublicKey = await getMXEPublicKey(provider, testProgramId);
    
    if (mxePublicKey) {
      console.log('✅ MXE Public Key:', Buffer.from(mxePublicKey).toString('hex'));
      
      // Generate encryption keys
      const privateKey = x25519.utils.randomSecretKey();
      const publicKey = x25519.getPublicKey(privateKey);
      console.log('\n🔐 Generated User Keys');
      console.log('Private:', Buffer.from(privateKey).toString('hex').slice(0, 20) + '...');
      console.log('Public:', Buffer.from(publicKey).toString('hex'));
      
      // Create shared secret
      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      console.log('\n🤝 Shared Secret:', Buffer.from(sharedSecret).toString('hex').slice(0, 20) + '...');
      
      // Initialize cipher
      const cipher = new RescueCipher(sharedSecret);
      
      // Prepare data to encrypt (simulating Aegis verification data)
      const invoiceAmount = BigInt(150000); // $150k
      const buyerIdHash = BigInt('0x' + randomBytes(8).toString('hex'));
      const plaintext = [invoiceAmount, buyerIdHash];
      
      console.log('\n📊 Data to Encrypt:');
      console.log('Invoice Amount:', invoiceAmount.toString());
      console.log('Buyer ID Hash:', buyerIdHash.toString(16));
      
      // Generate nonce
      const nonceBytes = randomBytes(16);
      const nonce = BigInt('0x' + nonceBytes.toString('hex'));
      
      // Encrypt
      const ciphertext = cipher.encrypt(plaintext, nonce);
      console.log('\n🔒 Encrypted Ciphertext:');
      console.log('Length:', ciphertext.length, 'elements');
      console.log('First element:', ciphertext[0].toString(16).slice(0, 20) + '...');
      
      console.log('\n✅ ENCRYPTION FLOW WORKS!');
      console.log('This proves we can:');
      console.log('1. Generate encryption keys');
      console.log('2. Create shared secrets with MXE');
      console.log('3. Encrypt sensitive data');
      console.log('4. Prepare for confidential computation');
      
    } else {
      console.log('⚠️  MXE public key not found (expected - no deployed MXE yet)');
      console.log('\nThis is expected! To actually use Arcium, you need to:');
      console.log('1. Deploy your own MXE program with confidential instructions');
      console.log('2. Initialize the MXE on devnet');
      console.log('3. Then encrypt + queue computations');
      
      console.log('\n💡 Alternative: Use existing Arcium examples on devnet');
      console.log('Or: Document this as "architecture-ready" integration');
    }
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    console.log('\nThis might be because:');
    console.log('- No MXE deployed at test program ID');
    console.log('- Devnet connection issues');
    console.log('- Missing initialization');
  }
}

testArciumEncryption().catch(console.error);
