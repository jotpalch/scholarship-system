import { test, expect } from '@playwright/test'

test.describe('Student Application Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication mocks
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
            username: 'student1',
            email: 'student@test.com',
            role: 'student',
            full_name: 'Test Student',
            is_active: true,
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          }
        })
      })
    })

    // Mock applications endpoint (empty initially)
    await page.route('**/api/v1/applications', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Applications retrieved',
            data: []
          })
        })
      }
    })

    // Login and navigate to student portal
    await page.goto('/')
    await page.fill('input[type="text"]', 'student1')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Academic Excellence')).toBeVisible()
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