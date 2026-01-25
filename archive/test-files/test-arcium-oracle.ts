import { ArciumOracle } from './arcium-oracle';

async function testOracle() {
  console.log('🧪 Testing Arcium Oracle Integration\n');
  
  // Initialize oracle
  const oracle = new ArciumOracle();
  await oracle.initialize();
  
  // Test policy verification
  const request = {
    dataset_id: 'invoice-001',
    invoice_amount: 150000,
    buyer_id: 'buyer-acme-corp',
    min_amount: 100000,
    approved_buyers: ['buyer-acme-corp', 'buyer-techco']
  };
  
  const result = await oracle.verifyPolicy(request);
  
  console.log('\n📊 Result:');
  console.log('   Job ID:', result.job_id);
  console.log('   Hash:', result.computation_hash);
  console.log('   Verified:', result.verified);
  console.log('   Timestamp:', new Date(result.timestamp).toISOString());
  
  console.log('\n✅ Oracle integration working!');
}

testOracle().catch(console.error);
