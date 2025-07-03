import { test, expect } from '@playwright/test'
import { setupAuthMocks, setupAdminMocks, clearBrowserState } from './test-helpers'

test('Debug - Check page content after login', async ({ page }) => {
  // Clear state and setup mocks
  await clearBrowserState(page)
  await setupAuthMocks(page, 'admin')
  await setupAdminMocks(page)
  
  // Navigate to login page and authenticate
  await page.goto('/')
  
  // Take screenshot before login
  await page.screenshot({ path: 'debug-before-login.png' })
  
  // Check if we need to login
  try {
    await page.locator('form').waitFor({ timeout: 5000 })
    
    console.log('Found login form, proceeding with login')
    
    // If form is found, proceed with login
    await page.locator('#username').fill('admin1')
    await page.locator('#password').fill('admin123')
    await page.locator('button[type="submit"]').click()
    
    // Wait a bit and take screenshot
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'debug-after-login.png' })
    
    // Print page content
    const pageContent = await page.content()
    console.log('Page content after login:')
    console.log(pageContent.substring(0, 2000)) // First 2000 characters
    
    // Check what text is actually on the page
    const bodyText = await page.locator('body').textContent()
    console.log('Body text:')
    console.log(bodyText?.substring(0, 1000))
    
  } catch (error) {
    console.log('No login form found, taking screenshot of current page')
    await page.screenshot({ path: 'debug-no-login-form.png' })
    
    const pageContent = await page.content()
    console.log('Page content without login:')
    console.log(pageContent.substring(0, 2000))
  }
}) 