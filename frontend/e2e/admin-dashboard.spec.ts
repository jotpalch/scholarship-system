import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login-page'
import { AdminDashboardPage } from './pages/admin-dashboard-page'
import { setupAuthMocks, setupAdminMocks, clearBrowserState } from './test-helpers'

test.describe('Admin Dashboard', () => {
  let loginPage: LoginPage
  let dashboardPage: AdminDashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    dashboardPage = new AdminDashboardPage(page)
    
    // Clear state and setup mocks
    await clearBrowserState(page)
    await setupAuthMocks(page, 'admin')
    await setupAdminMocks(page)
    
    // Navigate to login page and authenticate
    await page.goto('/')
    
    // Check if we need to login
    try {
      await page.locator('form').waitFor({ timeout: 5000 })
      
      // If form is found, proceed with login
      await page.locator('#username').fill('admin1')
      await page.locator('#password').fill('admin123')
      await page.locator('button[type="submit"]').click()
      
      // Wait for dashboard to load
      await page.locator('text=Admin Dashboard').waitFor({ timeout: 10000 })
    } catch (error) {
      // If no login form, we might already be authenticated
      console.log('No login form found, checking if already authenticated')
    }
  })

  test('should display admin dashboard with statistics', async ({ page }) => {
    await dashboardPage.expectDashboardVisible()
    await dashboardPage.expectStatistics()
    
    // Check specific numbers from mock data
    await expect(page.locator('text=150')).toBeVisible()
    await expect(page.locator('text=25')).toBeVisible()
    await expect(page.locator('text=89')).toBeVisible()
    await expect(page.locator('text=36')).toBeVisible()
  })

  test('should display all applications list', async ({ page }) => {
    await dashboardPage.expectApplicationsList()
    
    // Check application entries from mock data
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=jane@test.com')).toBeVisible()
    await expect(page.locator('text=academic_excellence')).toBeVisible()
    await expect(page.locator('text=need_based')).toBeVisible()
    await expect(page.locator('text=submitted')).toBeVisible()
    await expect(page.locator('text=under_review')).toBeVisible()
  })

  test('should filter applications by status', async ({ page }) => {
    // Wait for applications to load first
    await dashboardPage.expectApplicationsList()
    
    // Click on pending filter
    await dashboardPage.filterByStatus('Pending')
    
    // Should show only pending applications
    await expect(page.locator('text=submitted')).toBeVisible()
    await expect(page.locator('text=under_review')).toBeVisible()
    
    // Click on approved filter
    await dashboardPage.filterByStatus('Approved')
    
    // Should filter to approved applications only
    // (Mock would need to be updated for this test to be meaningful)
  })

  test('should approve application', async ({ page }) => {
    // Mock approval endpoint
    await page.route('**/api/v1/admin/applications/1/approve', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Application approved successfully',
          data: {
            id: 1,
            status: 'approved'
          }
        })
      })
    })

    // Wait for applications to load
    await dashboardPage.expectApplicationsList()
    
    // Approve application using page object method
    await dashboardPage.approveApplication('John Doe')
    
    // Should show success message
    await dashboardPage.expectSuccessMessage('Application approved successfully')
  })

  test('should reject application with reason', async ({ page }) => {
    // Mock rejection endpoint
    await page.route('**/api/v1/admin/applications/1/reject', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Application rejected',
          data: {
            id: 1,
            status: 'rejected'
          }
        })
      })
    })

    // Find application and click reject
    const applicationRow = page.locator('text=John Doe').locator('..')
    await applicationRow.locator('button:has-text("Reject")').click()
    
    // Should open rejection modal/form
    await expect(page.locator('text=Rejection Reason')).toBeVisible()
    
    // Fill rejection reason
    await page.fill('textarea[placeholder*="reason"]', 'Does not meet GPA requirements')
    
    // Confirm rejection
    await page.click('button:has-text("Confirm Rejection")')
    
    // Should show success message
    await expect(page.locator('text=Application rejected')).toBeVisible()
  })

  test('should search applications by student name', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'John')
    
    // Should filter to matching applications
    await expect(page.locator('text=John Doe')).toBeVisible()
    
    // Clear search
    await page.fill('input[placeholder*="Search"]', '')
    
    // Should show all applications again
    await expect(page.locator('text=Jane Smith')).toBeVisible()
  })

  test('should navigate to application details', async ({ page }) => {
    // Mock application details endpoint
    await page.route('**/api/v1/admin/applications/1', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Application details retrieved',
          data: {
            id: 1,
            student_id: 'student1',
            student_name: 'John Doe',
            student_email: 'john@test.com',
            scholarship_type: 'academic_excellence',
            status: 'submitted',
            personal_statement: 'I am a dedicated student with excellent academic performance...',
            gpa_requirement_met: true,
            documents: [
              {
                id: 1,
                filename: 'transcript.pdf',
                upload_date: '2025-01-01'
              }
            ],
            submitted_at: '2025-01-01T10:00:00Z',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          }
        })
      })
    })

    // Click on application to view details
    await page.click('text=John Doe')
    
    // Should show application details
    await expect(page.locator('text=Application Details')).toBeVisible()
    await expect(page.locator('text=I am a dedicated student with excellent academic performance')).toBeVisible()
    await expect(page.locator('text=transcript.pdf')).toBeVisible()
  })

  test('should export applications data', async ({ page }) => {
    // Mock export endpoint
    await page.route('**/api/v1/admin/applications/export', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: 'Mock Excel Content'
      })
    })

    // Click export button
    await page.click('button:has-text("Export")')
    
    // Should trigger download
    const downloadPromise = page.waitForEvent('download')
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toContain('applications')
  })

  test('should manage scholarship programs', async ({ page }) => {
    // Mock scholarships endpoint
    await page.route('**/api/v1/admin/scholarships', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Scholarships retrieved',
          data: [
            {
              id: 1,
              name: 'Academic Excellence Scholarship',
              type: 'academic_excellence',
              amount: 50000,
              gpa_requirement: 3.8,
              description: 'For academically outstanding students',
              is_active: true
            }
          ]
        })
      })
    })

    // Navigate to scholarships section
    await page.click('text=Scholarships')
    
    // Should show scholarships list
    await expect(page.locator('text=Academic Excellence Scholarship')).toBeVisible()
    await expect(page.locator('text=NT$ 50,000')).toBeVisible()
    await expect(page.locator('text=3.8 GPA required')).toBeVisible()
  })

  test('should show user management section', async ({ page }) => {
    // Mock users endpoint
    await page.route('**/api/v1/admin/users**', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Users retrieved',
          data: [
            {
              id: '1',
              username: 'student1',
              email: 'student1@test.com',
              role: 'student',
              full_name: 'John Doe',
              is_active: true,
              created_at: '2025-01-01'
            },
            {
              id: '2',
              username: 'professor1',
              email: 'professor1@test.com',
              role: 'professor',
              full_name: 'Dr. Smith',
              is_active: true,
              created_at: '2025-01-01'
            }
          ]
        })
      })
    })

    // Navigate to users section
    await page.click('text=Users')
    
    // Should show users list
    await expect(page.locator('text=student1@test.com')).toBeVisible()
    await expect(page.locator('text=professor1@test.com')).toBeVisible()
    await expect(page.locator('text=Dr. Smith')).toBeVisible()
  })
}) 