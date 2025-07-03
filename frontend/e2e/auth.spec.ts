import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login-page'
import { clearBrowserState } from './test-helpers'

test.describe('Authentication', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    // Ensure clean state for each test
    await clearBrowserState(page)
    await loginPage.goto()
  })

  test('should show login form when not authenticated', async ({ page }) => {
    await expect(page.locator('text=登入系統')).toBeVisible()
    await loginPage.expectLoginForm()
  })

  test('should handle login failure with invalid credentials', async ({ page }) => {
    await loginPage.login('invalid_user', 'invalid_pass')
    
    // Should show error message (actual message from the app)
    await loginPage.expectError('Validation failed')
  })

  test('should redirect to appropriate dashboard on successful login', async ({ page }) => {
    // Mock a successful login response
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            access_token: 'mock-token',
            token_type: 'Bearer'
          }
        })
      })
    })

    await page.route('**/api/v1/auth/me', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'User retrieved',
          data: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            role: 'student',
            full_name: 'Test User',
            is_active: true,
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          }
        })
      })
    })

    // Mock applications endpoint
    await page.route('**/api/v1/applications', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Applications retrieved',
          data: []
        })
      })
    })

    await loginPage.login('testuser', 'password123')
    
    // Should show student portal - look for Chinese text since app is in Chinese
    await expect(page.locator('text=學術優秀獎學金').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=我的申請')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            access_token: 'mock-token',
            token_type: 'Bearer'
          }
        })
      })
    })

    await page.route('**/api/v1/auth/me', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'User retrieved',
          data: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            role: 'student',
            full_name: 'Test User',
            is_active: true,
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          }
        })
      })
    })

    // Mock applications endpoint
    await page.route('**/api/v1/applications', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Applications retrieved',
          data: []
        })
      })
    })

    await loginPage.login('testuser', 'password123')
    
    // Wait for login to complete
    await expect(page.locator('text=學術優秀獎學金').first()).toBeVisible({ timeout: 10000 })
    
    // Find and click logout button (it's in a dropdown menu)
    await page.click('[data-testid="user-menu"], .avatar, [role="button"] img, button[aria-haspopup="menu"]')
    await page.click('text=登出')
    
    // Should return to login page
    await expect(page.locator('text=登入系統')).toBeVisible()
    await loginPage.expectLoginForm()
  })
}) 