import { recordSnapshot } from './snapshot.js';

/**
 * Test script - run snapshot manually
 */
console.log('🧪 Testing snapshot functionality...\n');

recordSnapshot()
  .then(result => {
    console.log('\n✅ Test completed');
    console.log('📋 Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

