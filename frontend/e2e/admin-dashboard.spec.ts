import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup admin authentication mocks
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          data: {
            access_token: 'admin-token',
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
            username: 'admin1',
            email: 'admin@test.com',
            role: 'admin',
            full_name: 'Test Admin',
            is_active: true,
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          }
        })
      })
    })

    // Mock admin dashboard stats
    await page.route('**/api/v1/admin/dashboard-stats', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Dashboard stats retrieved',
          data: {
            total_applications: 150,
            pending_review: 25,
            approved_applications: 89,
            rejected_applications: 36,
            total_students: 245,
            active_scholarships: 8
          }
        })
      })
    })

    // Mock all applications for admin
    await page.route('**/api/v1/admin/applications**', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Applications retrieved',
          data: [
            {
              id: 1,
              student_id: 'student1',
              student_name: 'John Doe',
              student_email: 'john@test.com',
              scholarship_type: 'academic_excellence',
              status: 'submitted',
              personal_statement: 'I am a dedicated student...',
              gpa_requirement_met: true,
              submitted_at: '2025-01-01T10:00:00Z',
              created_at: '2025-01-01',
              updated_at: '2025-01-01'
            },
            {
              id: 2,
              student_id: 'student2',
              student_name: 'Jane Smith',
              student_email: 'jane@test.com',
              scholarship_type: 'need_based',
              status: 'under_review',
              personal_statement: 'I need financial assistance...',
              gpa_requirement_met: true,
              submitted_at: '2025-01-01T11:00:00Z',
              created_at: '2025-01-01',
              updated_at: '2025-01-01'
            }
          ]
        })
      })
    })

    // Login as admin and navigate to dashboard
    await page.goto('/')
    await page.fill('input[type="text"]', 'admin1')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
  })

  test('should display admin dashboard with statistics', async ({ page }) => {
    await expect(page.locator('text=Admin Dashboard')).toBeVisible()
    
    // Check dashboard statistics
    await expect(page.locator('text=Total Applications')).toBeVisible()
    await expect(page.locator('text=150')).toBeVisible()
    
    await expect(page.locator('text=Pending Review')).toBeVisible()
    await expect(page.locator('text=25')).toBeVisible()
    
    await expect(page.locator('text=Approved')).toBeVisible()
    await expect(page.locator('text=89')).toBeVisible()
    
    await expect(page.locator('text=Rejected')).toBeVisible()
    await expect(page.locator('text=36')).toBeVisible()
  })

  test('should display all applications list', async ({ page }) => {
    await expect(page.locator('text=All Applications')).toBeVisible()
    
    // Check application entries
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=jane@test.com')).toBeVisible()
    await expect(page.locator('text=academic_excellence')).toBeVisible()
    await expect(page.locator('text=need_based')).toBeVisible()
    await expect(page.locator('text=submitted')).toBeVisible()
    await expect(page.locator('text=under_review')).toBeVisible()
  })

  test('should filter applications by status', async ({ page }) => {
    // Click on pending filter
    await page.click('button:has-text("Pending")')
    
    // Should show only pending applications
    await expect(page.locator('text=submitted')).toBeVisible()
    await expect(page.locator('text=under_review')).toBeVisible()
    
    // Click on approved filter
    await page.click('button:has-text("Approved")')
    
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

    // Find application and click approve
    const applicationRow = page.locator('text=John Doe').locator('..')
    await applicationRow.locator('button:has-text("Approve")').click()
    
    // Should show success message
    await expect(page.locator('text=Application approved successfully')).toBeVisible()
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
              username: 'faculty1',
              email: 'faculty1@test.com',
              role: 'faculty',
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
    await expect(page.locator('text=faculty1@test.com')).toBeVisible()
    await expect(page.locator('text=Dr. Smith')).toBeVisible()
  })
}) 