import { test, expect } from '@playwright/test';

test('User can register a new account and immediately access their new workspace', async ({ page }) => {
  const timestamp = Date.now().toString().slice(-4);
  const testEmail = `chef_${timestamp}@testkitchen.com`;
  const testPassword = 'Password@123';
  const testName = `Chef Gordon ${timestamp}`;
  const testOrgName = `Gordon Bistro ${timestamp}`;

  await page.goto('/login');
  
  // Switch to Create Account tab
  await page.click('button:has-text("Create Account")');
  await expect(page.locator('button:has-text("Create Workspace & Log In")')).toBeVisible();

  // Fill register form
  await page.fill('input#reg-name', testName);
  await page.fill('input#reg-email', testEmail);
  await page.fill('input#reg-password', testPassword);
  await page.fill('input#reg-org', testOrgName);
  await page.click('button:has-text("Create Workspace & Log In")');

  // Verify redirected to dashboard and authenticated
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page.locator('.hero-title')).toContainText(new RegExp(testName, 'i'));
});
