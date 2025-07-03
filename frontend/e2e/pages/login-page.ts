import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.text-red-600');
    this.loginForm = page.locator('form');
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  async waitForLoad() {
    // Check if we're already logged in (redirected to dashboard)
    const currentUrl = this.page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/admin') || currentUrl.includes('/student')) {
      // User is already logged in, we can skip login form validation
      return;
    }

    // Wait for the login form to be visible
    await expect(this.loginForm).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async ensureLoggedOut() {
    // Go to home page and check if we need to logout
    await this.page.goto('/');
    
    // If there's a user menu, logout first
    try {
      await this.page.click('button[aria-haspopup="menu"]', { timeout: 2000 });
      await this.page.click('text=登出', { timeout: 2000 });
      await this.waitForLoad();
    } catch {
      // No user menu found, probably already logged out
      await this.waitForLoad();
    }
  }

  async login(username: string, password: string) {
    // Clear any existing values
    await this.usernameInput.clear();
    await this.passwordInput.clear();
    
    // Fill form fields
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    
    // Submit form
    await this.submitButton.click();
  }

  async expectLoginForm() {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectError(message?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
} 