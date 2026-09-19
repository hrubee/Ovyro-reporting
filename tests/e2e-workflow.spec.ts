import { test, expect } from '@playwright/test';

test.describe('Reporting SaaS End-to-End Workflow', () => {
  test('User can log in, view dashboard, manage outlets, and build/delete report tabs', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-4);
    const testOutletName = `Skyline Kitchen ${timestamp}`;
    const testOutletCode = `SKY-${timestamp}`;
    const testTabName = `Pastry Chiller Temp ${timestamp}`;
    const toDeleteTabName = `Temp Tab To Delete ${timestamp}`;

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

    // 5. Test Report Tabs Manager (/admin/templates)
    await page.goto('/admin/templates');
    await expect(page.locator('.admin-page-title')).toContainText(/Report Tabs/i);

    // Create Report Tab 1
    await page.click('button:has-text("Create New Report Tab")');
    await expect(page.locator('.modal-card h2')).toContainText(/Create New Report Tab/i);

    // Test preset button (e.g. Temperature)
    await page.click('button.preset-btn:has-text("TEMPERATURE")');
    await page.fill('input[placeholder*="e.g. Cold Chain Storage Log"]', testTabName);
    await page.click('button[type="submit"]:has-text("Create Report Tab")');

    // Verify new Report Tab card is rendered
    await expect(page.locator(`.template-card:has-text("${testTabName}")`)).toBeVisible();

    // Create Report Tab 2 (to test deletion)
    await page.click('button:has-text("Create New Report Tab")');
    await page.click('button.preset-btn:has-text("EQUIPMENT")');
    await page.fill('input[placeholder*="e.g. Cold Chain Storage Log"]', toDeleteTabName);
    await page.click('button[type="submit"]:has-text("Create Report Tab")');

    // Verify created
    await expect(page.locator(`.template-card:has-text("${toDeleteTabName}")`)).toBeVisible();

    // Accept browser confirmation dialog for deletion
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click Delete on the second report tab card
    const deleteBtn = page.locator(`.template-card:has-text("${toDeleteTabName}") button:has-text("Delete")`);
    await deleteBtn.click();

    // Verify it is removed from UI
    await expect(page.locator(`.template-card:has-text("${toDeleteTabName}")`)).not.toBeVisible();

    // 6. Test Navigation to an Assigned Report Tab Sheet (Verify NO 404)
    await page.goto('/dashboard');
    await page.waitForTimeout(500);

    // Click on the first active report tab link
    const firstChecklistLink = page.locator('.checklist-card').first();
    if (await firstChecklistLink.isVisible()) {
      await firstChecklistLink.click();
      // Ensure form rendered and no 404 error
      await expect(page.locator('.dynamic-sheet-page')).toBeVisible();
      await expect(page.locator('button.btn-primary-save')).toBeVisible();
    }

    // 7. Test Reports Hub (/admin/reports)
    await page.goto('/admin/reports');
    await expect(page.locator('.admin-page-title')).toContainText(/Audit Reports/i);
    await expect(page.locator('button:has-text("Export to CSV")')).toBeVisible();
  });
});



