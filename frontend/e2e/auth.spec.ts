import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show login form when not authenticated', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Scholarship Management System')
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should handle login failure with invalid credentials', async ({ page }) => {
    await page.fill('input[type="text"]', 'invalid_user')
    await page.fill('input[type="password"]', 'invalid_pass')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Login failed')).toBeVisible()
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

    await page.fill('input[type="text"]', 'testuser')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Should show student portal
    await expect(page.locator('text=Academic Excellence')).toBeVisible()
    await expect(page.locator('text=My Applications')).toBeVisible()
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

    await page.fill('input[type="text"]', 'testuser')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for login to complete
    await expect(page.locator('text=Academic Excellence')).toBeVisible()
    
    // Find and click logout button
    await page.click('button:has-text("Logout")')
    
    // Should return to login page
    await expect(page.locator('h1')).toContainText('Scholarship Management System')
    await expect(page.locator('input[type="text"]')).toBeVisible()
  })
}) 