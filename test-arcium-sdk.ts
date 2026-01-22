import { getArciumEnv } from '@arcium-hq/client';

console.log('Testing Arcium SDK...');

try {
  // This should work now since we have the package
  const env = getArciumEnv();
  console.log('Arcium Environment:', env);
} catch (e) {
  console.log('Error (expected for devnet):', e.message);
}

console.log('\nSDK imported successfully! ✅');
