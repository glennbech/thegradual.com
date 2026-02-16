/**
 * Test configuration for Playwright
 *
 * DEDICATED TEST UUID:
 * This UUID is used exclusively for Playwright tests.
 * Data created with this UUID will be cleaned up after tests.
 */

export const TEST_CONFIG = {
  // Dedicated test user UUID (won't interfere with real users)
  testUserUUID: 'playwright-test-user-12345',

  // Test user credentials (use the existing test account)
  credentials: {
    email: 'vjoedqdz@sharklasers.com',
    password: 'E6_Qk2J6n1?P',
  },

  // API endpoint for cleanup
  apiEndpoint: 'https://api.thegradual.com/api',

  // Timeouts
  timeouts: {
    navigation: 10000,
    apiCall: 5000,
  },
};
