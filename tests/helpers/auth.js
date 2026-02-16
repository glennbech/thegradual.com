import { TEST_CONFIG } from '../config.js';

/**
 * Sign in to TheGradual with test credentials
 * Handles the full OAuth flow with AWS Cognito
 */
export async function signIn(page) {
  console.log('🔐 Starting sign-in process...');

  // Go to home page
  await page.goto('/');
  console.log('✅ Loaded home page');

  // Click Sign In button
  const signInButton = page.locator('text=SIGN IN WITH GOOGLE').first();
  await signInButton.waitFor({ state: 'visible', timeout: 5000 });
  await signInButton.click();
  console.log('✅ Clicked sign in button');

  // Wait for Cognito page to load
  await page.waitForLoadState('networkidle', { timeout: TEST_CONFIG.timeouts.navigation });

  // Fill in credentials
  const emailField = page.locator('input[name="username"]').last();
  await emailField.waitFor({ state: 'visible', timeout: TEST_CONFIG.timeouts.navigation });
  await emailField.fill(TEST_CONFIG.credentials.email);
  console.log('✅ Entered email');

  const passwordField = page.locator('input[name="password"]').last();
  await passwordField.fill(TEST_CONFIG.credentials.password);
  console.log('✅ Entered password');

  // Submit and wait for redirect
  await passwordField.press('Enter');
  await page.waitForURL('/', { timeout: TEST_CONFIG.timeouts.navigation });
  console.log('✅ Signed in successfully');

  // Wait for app to be fully loaded
  await page.waitForLoadState('networkidle');

  return page;
}

/**
 * Check if user is already signed in
 */
export async function isSignedIn(page) {
  // Look for sign out button or user avatar
  const signedInIndicator = page.locator('[data-testid="user-avatar"], text=Sign Out').first();
  const isVisible = await signedInIndicator.isVisible().catch(() => false);
  return isVisible;
}
