import { Page, Locator, expect } from '@playwright/test';

export class AdminDashboardPage {
  readonly page: Page;
  readonly dashboardTitle: Locator;
  readonly statisticsCards: Locator;
  readonly applicationsTable: Locator;
  readonly filterButtons: Locator;
  readonly approveButtons: Locator;
  readonly rejectButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboardTitle = page.locator('text=Admin Dashboard');
    this.statisticsCards = page.locator('[data-testid="dashboard-stats"]');
    this.applicationsTable = page.locator('[data-testid="applications-table"]');
    this.filterButtons = page.locator('[data-testid="status-filter"]');
    this.approveButtons = page.locator('button:has-text("Approve")');
    this.rejectButtons = page.locator('button:has-text("Reject")');
  }

  async waitForLoad() {
    // Wait for dashboard to load
    await expect(this.dashboardTitle).toBeVisible();
    // Give extra time for API calls to complete
    await this.page.waitForTimeout(1000);
  }

  async expectDashboardVisible() {
    await expect(this.dashboardTitle).toBeVisible();
  }

  async expectStatistics() {
    await expect(this.page.locator('text=Total Applications')).toBeVisible();
    await expect(this.page.locator('text=Pending Review')).toBeVisible();
    await expect(this.page.locator('text=Approved')).toBeVisible();
    await expect(this.page.locator('text=Rejected')).toBeVisible();
  }

  async expectApplicationsList() {
    await expect(this.page.locator('text=All Applications')).toBeVisible();
  }

  async filterByStatus(status: string) {
    await this.page.click(`button:has-text("${status}")`);
  }

  async approveApplication(studentName: string) {
    const applicationRow = this.page.locator(`text=${studentName}`).locator('..');
    await applicationRow.locator('button:has-text("Approve")').click();
  }

  async rejectApplication(studentName: string, reason?: string) {
    const applicationRow = this.page.locator(`text=${studentName}`).locator('..');
    await applicationRow.locator('button:has-text("Reject")').click();
    
    if (reason) {
      await this.page.locator('textarea[placeholder*="reason"]').fill(reason);
      await this.page.click('button:has-text("Confirm Rejection")');
    }
  }

  async expectSuccessMessage(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }
} 