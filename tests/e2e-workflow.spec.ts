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

      // Test YES / NO / NA 3-way toggle and Quick Action batch buttons
      const allYesBtn = page.locator('button.quick-btn-action.yes').first();
      if (await allYesBtn.isVisible()) {
        await allYesBtn.click();
        await expect(page.locator('.touch-btn-option.active-yes').first()).toBeVisible();

        // Click All NA
        const allNaBtn = page.locator('button.quick-btn-action.na').first();
        await allNaBtn.click();
        await expect(page.locator('.touch-btn-option.active-na').first()).toBeVisible();

        // Click single YES
        const singleYesBtn = page.locator('.touch-btn-option:has-text("YES")').first();
        await singleYesBtn.click();
        await expect(singleYesBtn).toHaveClass(/active-yes/);
      }
      // Test Touch Time Select if available
      const timeSelect = page.locator('select.touch-time-select').first();
      if (await timeSelect.isVisible()) {
        await timeSelect.selectOption('10:00');
        await expect(timeSelect).toHaveValue('10:00');
      }

      // Test Date Quick Pills
      const todayPill = page.locator('.date-quick-pills button:has-text("Today")');
      if (await todayPill.isVisible()) {
        await todayPill.click();
        await expect(todayPill).toHaveClass(/active/);
      }
    }

    // 7. Test Reports Hub (/admin/reports)
    await page.goto('/admin/reports');
    await expect(page.locator('.admin-page-title')).toContainText(/Audit Reports/i);
    await expect(page.locator('button:has-text("Export to CSV")')).toBeVisible();
  });

  test('Mobile Responsive UX: works seamlessly on mobile viewports (390x844)', async ({ page }) => {
    // Set mobile viewport (e.g. iPhone 14 / Pixel)
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Visit Login on Mobile
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@reporting.app');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // 2. Verify Mobile Topbar
    await page.waitForURL('**/dashboard');
    await expect(page.locator('.mobile-topbar')).toBeVisible();

    // 3. Test Mobile Navigation Drawer
    await page.click('.mobile-hamburger-btn');
    await expect(page.locator('.sidebar.open')).toBeVisible();
    await expect(page.locator('.sidebar-backdrop')).toBeVisible();

    // Close drawer via close button
    await page.click('.sidebar-close-btn');
    await expect(page.locator('.sidebar')).not.toHaveClass(/open/);

    // 4. Open an audit sheet on mobile
    const firstChecklistLink = page.locator('.checklist-card').first();
    if (await firstChecklistLink.isVisible()) {
      await firstChecklistLink.click();
      await expect(page.locator('.dynamic-sheet-page')).toBeVisible();

      // Verify sticky save bar is visible at bottom
      await expect(page.locator('.sticky-action-bar')).toBeVisible();
      await expect(page.locator('button.btn-primary-save')).toBeVisible();

      // Test mobile touch batch action
      const allYesBtn = page.locator('button.quick-btn-action.yes').first();
      if (await allYesBtn.isVisible()) {
        await allYesBtn.click();
        await expect(page.locator('.touch-btn-option.active-yes').first()).toBeVisible();
      }
    }
  });
});



