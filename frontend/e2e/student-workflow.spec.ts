import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login-page'
import { setupAuthMocks, setupStudentMocks, clearBrowserState } from './test-helpers'

test.describe('Student Application Workflow', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    
    // Clear state and setup mocks
    await clearBrowserState(page)
    await setupAuthMocks(page, 'student')
    await setupStudentMocks(page)
    
    // Navigate to login page and authenticate
    await page.goto('/')
    
    // Check if we need to login
    try {
      await page.locator('form').waitFor({ timeout: 5000 })
      
      // If form is found, proceed with login
      await page.locator('#username').fill('student1')
      await page.locator('#password').fill('password123')
      await page.locator('button[type="submit"]').click()
      
      // Wait for student dashboard to load
      await page.locator('text=學術優秀獎學金').first().waitFor({ timeout: 10000 })
    } catch (error) {
      // If no login form, we might already be authenticated
      console.log('No login form found, checking if already authenticated')
    }
  })

  test('should display empty state when no applications exist', async ({ page }) => {
    await expect(page.locator('text=No application records yet')).toBeVisible()
    await expect(page.locator('text=Click \'New Application\' to start applying for scholarship')).toBeVisible()
  })

  test('should create new application successfully', async ({ page }) => {
    // Mock application creation
    await page.route('**/api/v1/applications', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Application created successfully',
            data: {
              id: 1,
              student_id: 'student1',
              scholarship_type: 'academic_excellence',
              status: 'draft',
              personal_statement: 'I am a dedicated student...',
              expected_graduation_date: '2025-06-15',
              gpa_requirement_met: true,
              created_at: '2025-01-01',
              updated_at: '2025-01-01'
            }
          })
        })
      }
    })

    // Click on New Application tab
    await page.click('text=New Application')
    
    // Fill out the application form
    await page.selectOption('select', 'academic_excellence')
    await page.fill('input[type="date"]', '2025-06-15')
    await page.fill('textarea', 'I am a dedicated student with excellent academic performance and a strong commitment to my field of study.')
    
    // Submit the application
    await page.click('button:has-text("Submit Application")')
    
    // Should show success message or redirect
    await expect(page.locator('text=Application created successfully')).toBeVisible()
  })

  test('should validate form fields before submission', async ({ page }) => {
    // Click on New Application tab
    await page.click('text=New Application')
    
    // Try to submit without filling required fields
    const submitButton = page.locator('button:has-text("Submit Application")')
    await expect(submitButton).toBeDisabled()
    
    // Fill only one field
    await page.selectOption('select', 'academic_excellence')
    
    // Should still be disabled
    await expect(submitButton).toBeDisabled()
    
    // Fill all required fields
    await page.fill('input[type="date"]', '2025-06-15')
    await page.fill('textarea', 'I am a dedicated student with excellent academic performance.')
    
    // Now button should be enabled
    await expect(submitButton).toBeEnabled()
  })

  test('should show form completion progress', async ({ page }) => {
    await page.click('text=New Application')
    
    // Initially 0% complete
    await expect(page.locator('text=0%')).toBeVisible()
    
    // Fill scholarship type
    await page.selectOption('select', 'academic_excellence')
    
    // Should show progress increase
    await expect(page.locator('text=33%')).toBeVisible()
    
    // Fill graduation date
    await page.fill('input[type="date"]', '2025-06-15')
    
    // Should show more progress
    await expect(page.locator('text=67%')).toBeVisible()
    
    // Fill personal statement
    await page.fill('textarea', 'Complete personal statement...')
    
    // Should show 100% complete
    await expect(page.locator('text=100%')).toBeVisible()
  })

  test('should display application list with correct information', async ({ page }) => {
    // Mock applications with data
    await page.route('**/api/v1/applications', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Applications retrieved',
            data: [
              {
                id: 1,
                student_id: 'student1',
                scholarship_type: 'academic_excellence',
                status: 'submitted',
                personal_statement: 'I am a dedicated student...',
                gpa_requirement_met: true,
                submitted_at: '2025-01-01T10:00:00Z',
                created_at: '2025-01-01',
                updated_at: '2025-01-01'
              }
            ]
          })
        })
      }
    })

    // Reload to get updated applications
    await page.reload()
    await expect(page.locator('text=Academic Excellence')).toBeVisible()
    
    // Should show application details
    await expect(page.locator('text=Application ID: 1')).toBeVisible()
    await expect(page.locator('text=academic_excellence')).toBeVisible()
    await expect(page.locator('text=Submitted')).toBeVisible()
  })

  test('should allow withdrawing submitted application', async ({ page }) => {
    // Mock applications with submitted application
    await page.route('**/api/v1/applications', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Applications retrieved',
            data: [
              {
                id: 1,
                student_id: 'student1',
                scholarship_type: 'academic_excellence',
                status: 'submitted',
                personal_statement: 'I am a dedicated student...',
                gpa_requirement_met: true,
                submitted_at: '2025-01-01T10:00:00Z',
                created_at: '2025-01-01',
                updated_at: '2025-01-01'
              }
            ]
          })
        })
      }
    })

    // Mock withdraw endpoint
    await page.route('**/api/v1/applications/1/withdraw', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Application withdrawn',
          data: {
            id: 1,
            status: 'withdrawn'
          }
        })
      })
    })

    await page.reload()
    await expect(page.locator('text=Academic Excellence')).toBeVisible()
    
    // Click withdraw button
    await page.click('button:has-text("Withdraw")')
    
    // Should show success message
    await expect(page.locator('text=Application withdrawn')).toBeVisible()
  })

  test('should switch between English and Chinese language', async ({ page }) => {
    // Initially in English
    await expect(page.locator('text=My Applications')).toBeVisible()
    await expect(page.locator('text=New Application')).toBeVisible()
    
    // Switch to Chinese
    await page.click('button:has-text("中文")')
    
    // Should show Chinese text
    await expect(page.locator('text=我的申請')).toBeVisible()
    await expect(page.locator('text=新增申請')).toBeVisible()
    
    // Switch back to English
    await page.click('button:has-text("English")')
    
    // Should show English text again
    await expect(page.locator('text=My Applications')).toBeVisible()
    await expect(page.locator('text=New Application')).toBeVisible()
  })

  test('should show application progress timeline', async ({ page }) => {
    // Mock applications with submitted application
    await page.route('**/api/v1/applications', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Applications retrieved',
            data: [
              {
                id: 1,
                student_id: 'student1',
                scholarship_type: 'academic_excellence',
                status: 'submitted',
                personal_statement: 'I am a dedicated student...',
                gpa_requirement_met: true,
                submitted_at: '2025-01-01T10:00:00Z',
                created_at: '2025-01-01',
                updated_at: '2025-01-01'
              }
            ]
          })
        })
      }
    })

    await page.reload()
    await expect(page.locator('text=Academic Excellence')).toBeVisible()
    
    // Should show progress timeline
    await expect(page.locator('text=Review Progress')).toBeVisible()
    await expect(page.locator('text=Submit Application')).toBeVisible()
    await expect(page.locator('text=Initial Review')).toBeVisible()
    await expect(page.locator('text=Final Decision')).toBeVisible()
  })
}) 