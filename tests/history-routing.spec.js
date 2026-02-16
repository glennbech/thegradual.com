import { test, expect } from '@playwright/test';

test('history page loads from direct URL', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Go to home page
  await page.goto('http://localhost:5555/');
  console.log('Current URL after initial load:', page.url());
  await page.screenshot({ path: 'test-screenshots/01-home-page.png' });

  // Click Sign In button
  console.log('Clicking sign in button...');
  await page.click('text=SIGN IN WITH GOOGLE');

  // Wait for navigation to Cognito
  await page.waitForLoadState('networkidle');
  console.log('Current URL after clicking sign in:', page.url());
  await page.screenshot({ path: 'test-screenshots/02-after-signin-click.png' });

  // Wait for email field to be visible
  console.log('Waiting for email field...');
  const emailField = page.locator('input[name="username"]').last();
  await emailField.waitFor({ state: 'visible', timeout: 10000 });

  console.log('Filling email...');
  await emailField.fill('vjoedqdz@sharklasers.com');
  await page.screenshot({ path: 'test-screenshots/03-email-filled.png' });

  console.log('Filling password...');
  const passwordField = page.locator('input[name="password"]').last();
  await passwordField.fill('E6_Qk2J6n1?P');
  await page.screenshot({ path: 'test-screenshots/04-password-filled.png' });

  // Submit form by pressing Enter
  console.log('Pressing Enter to submit...');
  await passwordField.press('Enter');
  await page.screenshot({ path: 'test-screenshots/05-after-signin.png' });

  // Wait for redirect back to app
  await page.waitForURL('http://localhost:5555/', { timeout: 10000 });
  console.log('Redirected back to app:', page.url());
  await page.screenshot({ path: 'test-screenshots/06-logged-in.png' });

  // Navigate directly to /history
  await page.goto('http://localhost:5555/history');
  console.log('Navigated to history:', page.url());
  await page.screenshot({ path: 'test-screenshots/07-history-page.png' });

  // Verify we're on the history page
  await expect(page.locator('text=History')).toBeVisible();

  console.log('✅ History page loaded successfully from direct URL');
});
