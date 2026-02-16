import { cleanupTestData, verifyCleanState } from './helpers/cleanup.js';

/**
 * Global setup - runs once before all tests
 * Cleans up any existing test data from previous runs
 */
export default async function globalSetup() {
  console.log('\n🧹 Running global setup...\n');

  // Clean up any existing test data
  const isClean = await verifyCleanState();

  if (!isClean) {
    console.error('❌ Failed to clean test data. Tests may fail.');
    throw new Error('Test environment is not clean');
  }

  console.log('\n✅ Global setup complete\n');
}
