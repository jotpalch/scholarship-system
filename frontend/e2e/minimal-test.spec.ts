import { test, expect } from '@playwright/test'

test('Minimal - just check actual page structure', async ({ page }) => {
  await page.goto('/')
  
  // Wait for page to stabilize
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  
  // Take a screenshot first
  await page.screenshot({ path: 'minimal-page-check.png', fullPage: true })
  
  // Print all HTML content to understand structure
  const htmlContent = await page.content()
  console.log('=== PAGE HTML (first 3000 chars) ===')
  console.log(htmlContent.substring(0, 3000))
  
  // Check for specific elements we expect
  console.log('=== ELEMENT CHECKS ===')
  
  // Check if there's a username input
  const usernameExists = await page.locator('#username').count()
  console.log('Username input count:', usernameExists)
  
  // Check if there's a password input
  const passwordExists = await page.locator('#password').count()
  console.log('Password input count:', passwordExists)
  
  // Check all input elements
  const allInputs = await page.locator('input').count()
  console.log('Total input count:', allInputs)
  
  // Get all input types and attributes
  const inputs = page.locator('input')
  for (let i = 0; i < await inputs.count(); i++) {
    const input = inputs.nth(i)
    const id = await input.getAttribute('id')
    const type = await input.getAttribute('type')
    const placeholder = await input.getAttribute('placeholder')
    console.log(`Input ${i}: id=${id}, type=${type}, placeholder=${placeholder}`)
  }
  
  // Check form element
  const formExists = await page.locator('form').count()
  console.log('Form count:', formExists)
  
  // Check if login text exists
  const loginTextExists = await page.locator('text=登入').count()
  console.log('Login text count:', loginTextExists)
  
  // Wait a bit more to ensure everything is loaded
  await page.waitForTimeout(2000)
  
  // Try to interact with form if it exists
  if (formExists > 0) {
    console.log('Form exists, checking if inputs are ready...')
    
    try {
      await page.locator('#username').waitFor({ timeout: 5000 })
      console.log('Username input is ready')
      
      await page.locator('#username').fill('test')
      console.log('Successfully filled username')
      
      const value = await page.locator('#username').inputValue()
      console.log('Username value:', value)
      
    } catch (error) {
      console.log('Error with username input:', error.message)
    }
  }
}) 