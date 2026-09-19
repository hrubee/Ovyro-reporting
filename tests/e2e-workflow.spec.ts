import { test, expect } from '@playwright/test';

test.describe('Reporting SaaS End-to-End Workflow', () => {
  test('User can log in, view dashboard, manage outlets, and build templates', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-4);
    const testOutletName = `Skyline Kitchen ${timestamp}`;
    const testOutletCode = `SKY-${timestamp}`;
    const testTemplateName = `Pastry Chiller Temp ${timestamp}`;

    // 1. Visit Login Page
    await page.goto('/login');
    await expect(page).toHaveTitle(/Reporting/i);

    // 2. Sign in as Admin
    await page.fill('input[type="email"]', 'admin@reporting.app');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // 3. Verify Dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('.hero-title')).toContainText(/Welcome back/i);

    // 4. Test Outlets Management (/admin/outlets)
    await page.goto('/admin/outlets');
    await expect(page.locator('.admin-page-title')).toContainText(/Facilities & Outlets/i);

    // Click "Add New Outlet / Facility"
    await page.click('button:has-text("Add New Outlet")');
    await expect(page.locator('.modal-card h2')).toContainText(/Add New Facility/i);

    // Fill new facility form
    await page.fill('input[placeholder*="Downtown Central Kitchen"]', testOutletName);
    await page.fill('input[placeholder*="DT-01"]', testOutletCode);
    await page.fill('input[placeholder*="Street address"]', '77 Skyline Heights Avenue');
    await page.click('button:has-text("Add Facility")');

    // Verify new facility card is rendered
    await expect(page.locator(`.outlet-card:has-text("${testOutletName}")`)).toBeVisible();

    // 5. Test Template Builder (/admin/templates)
    await page.goto('/admin/templates');
    await expect(page.locator('.admin-page-title')).toContainText(/Dynamic Template Builder/i);

    // Click "Create New Template"
    await page.click('button:has-text("Create New Template")');
    await expect(page.locator('.modal-card h2')).toContainText(/Create New Dynamic Template/i);

    // Test preset button (e.g. Temperature)
    await page.click('button.preset-btn:has-text("TEMPERATURE")');
    await page.fill('input[placeholder*="e.g. Cold Chain Storage Log"]', testTemplateName);
    await page.click('button[type="submit"]:has-text("Create Template")');

    // Verify new template card is rendered
    await expect(page.locator(`.template-card:has-text("${testTemplateName}")`)).toBeVisible();

    // 6. Test Reports Hub (/admin/reports)
    await page.goto('/admin/reports');
    await expect(page.locator('.admin-page-title')).toContainText(/Audit Reports/i);
    await expect(page.locator('button:has-text("Export to CSV")')).toBeVisible();
  });
});
