import { test, expect } from '@playwright/test'

test('Simple check - what is on the homepage', async ({ page }) => {
  await page.goto('/')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Take a screenshot to see what's there
  await page.screenshot({ path: 'homepage-content.png', fullPage: true })
  
  // Get all visible text
  const bodyText = await page.locator('body').textContent()
  console.log('=== ALL PAGE TEXT ===')
  console.log(bodyText)
  
  // Check for specific elements
  const buttons = await page.locator('button').allTextContents()
  console.log('=== BUTTONS ===')
  console.log(buttons)
  
  const links = await page.locator('a').allTextContents()
  console.log('=== LINKS ===')
  console.log(links)
  
  // Check for forms
  const forms = await page.locator('form').count()
  console.log('=== FORMS COUNT ===')
  console.log(forms)
  
  if (forms > 0) {
    const formInputs = await page.locator('form input').allTextContents()
    console.log('=== FORM INPUTS ===')
    console.log(formInputs)
  }
  
  // Check for common navigation elements
  const nav = await page.locator('nav').textContent()
  console.log('=== NAVIGATION ===')
  console.log(nav)
}) 