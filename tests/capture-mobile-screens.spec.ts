import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Capture mobile screenshots for visual review', async ({ page }) => {
  const screenshotDir = path.join(process.cwd(), 'playwright-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Set standard iPhone 14/15 mobile viewport
  await page.setViewportSize({ width: 393, height: 852 });

  // 1. Mobile Login
  await page.goto('/login');
  await page.screenshot({ path: path.join(screenshotDir, '01-mobile-login.png'), fullPage: true });

  // Sign in
  await page.fill('input[type="email"]', 'admin@reporting.app');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  // 2. Mobile Dashboard
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, '02-mobile-dashboard.png'), fullPage: true });

  // 3. Mobile Navigation Drawer Open
  await page.click('.mobile-hamburger-btn');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotDir, '03-mobile-drawer.png') });
  await page.click('.sidebar-close-btn');
  await page.waitForTimeout(300);

  // 4. Mobile Checklist / SOP Form
  const firstChecklist = page.locator('.checklist-card').first();
  if (await firstChecklist.isVisible()) {
    await firstChecklist.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '04-mobile-checklist-top.png') });
    // Scroll down to see touch tables transformed into cards
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, '05-mobile-checklist-cards.png') });
  }

  // 5. Mobile Admin Outlets
  await page.goto('/admin/outlets');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, '06-mobile-admin-outlets.png'), fullPage: true });

  // 6. Mobile Admin Templates
  await page.goto('/admin/templates');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, '07-mobile-admin-templates.png'), fullPage: true });

  // Open "Create New Report Tab" modal
  await page.click('button:has-text("Create New Report Tab")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotDir, '09-mobile-modal-popup.png') });

  // Scroll modal form down to inspect section items, add item button, and dustbin delete icons
  const modalForm = page.locator('.modal-form');
  if (await modalForm.isVisible()) {
    await modalForm.evaluate((el) => el.scrollBy(0, 950));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotDir, '10-mobile-modal-items-dustbin.png') });
  }
  await page.click('.modal-close-btn');
  await page.waitForTimeout(300);

  // 7. Mobile Admin Reports
  await page.goto('/admin/reports');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotDir, '08-mobile-admin-reports.png'), fullPage: true });
});
