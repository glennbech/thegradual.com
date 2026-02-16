import { cleanupTestData } from './helpers/cleanup.js';

/**
 * Global teardown - runs once after all tests
 * Cleans up test data from production
 */
export default async function globalTeardown() {
  console.log('\n🧹 Running global teardown...\n');

  // Clean up test data
  await cleanupTestData();

  console.log('\n✅ Global teardown complete\n');
}
