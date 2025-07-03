import { test, expect } from '@playwright/test'

test.describe('Working Tests Based on Actual UI', () => {
  
  test('should show login page correctly', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Verify we can see the login system text
    await expect(page.locator('text=登入系統')).toBeVisible()
    
    // Verify the form exists
    await expect(page.locator('form')).toBeVisible()
    
    // Verify the login button exists
    await expect(page.locator('button:has-text("登入")')).toBeVisible()
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'login-page-verification.png' })
  })

  test('should fill in login form', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Wait for form to be ready
    await page.locator('form').waitFor()
    
    // Use the correct IDs as defined in the actual component
    const usernameInput = page.locator('#username')
    const passwordInput = page.locator('#password')
    
    // Wait for inputs to be visible
    await expect(usernameInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    
    // Fill the inputs
    await usernameInput.fill('testuser')
    await passwordInput.fill('testpass')
    
    // Verify the values were filled
    await expect(usernameInput).toHaveValue('testuser')
    await expect(passwordInput).toHaveValue('testpass')
    
    // Take screenshot to show filled form
    await page.screenshot({ path: 'filled-login-form.png' })
  })

  test('should submit login form and handle response', async ({ page }) => {
    // Mock the login API
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            access_token: 'test-token-123',
            token_type: 'Bearer',
            user: {
              id: '1',
              username: 'testuser',
              role: 'student'
            }
          }
        })
      })
    })

    // Mock the user info endpoint
    await page.route('**/api/v1/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: '1',
            username: 'testuser',
            role: 'student',
            email: 'test@test.com'
          }
        })
      })
    })

    // Mock any other endpoints that might be called
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Fill and submit the form using correct IDs
    await page.locator('#username').fill('testuser')
    await page.locator('#password').fill('testpass')
    
    // Click the login button
    await page.locator('button:has-text("登入")').click()
    
    // Wait for any navigation or response
    await page.waitForTimeout(2000)
    
    // Take screenshot to see what happened
    await page.screenshot({ path: 'after-login-submit.png' })
    
    // Check if we're still on the login page or redirected
    const stillOnLogin = await page.locator('text=登入系統').isVisible()
    console.log('Still on login page:', stillOnLogin)
    
    if (!stillOnLogin) {
      console.log('Successfully navigated away from login page')
    }
  })
}) 