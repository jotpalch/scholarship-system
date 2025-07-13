import { Page } from '@playwright/test';

/**
 * Clear all browser storage and cookies to ensure clean test state
 */
export async function clearBrowserState(page: Page) {
  await page.context().clearCookies();
  
  // Try to clear storage, but handle security errors gracefully
  try {
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    });
  } catch (error) {
    // Ignore security errors when trying to clear storage
    console.log('Could not clear browser storage (security restriction)');
  }
}

/**
 * Setup common API mocks for authentication
 */
export async function setupAuthMocks(page: Page, userRole: 'student' | 'professor' | 'admin' = 'admin') {
  // Mock login endpoint
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
    });
  });

  // Mock user info endpoint
  await page.route('**/api/v1/auth/me', (route) => {
    const userData = {
      student: {
        id: '1',
        nycu_id: 'student1',
        email: 'student@test.com',
        role: 'student',
        name: 'Test Student',
        user_type: 'student',
        status: '在學',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        raw_data: {
          chinese_name: '測試學生',
          english_name: 'Test Student'
        }
      },
      professor: {
        id: '2',
        nycu_id: 'professor1',
        email: 'professor@test.com',
        role: 'professor',
        name: 'Test Professor',
        user_type: 'employee',
        status: '在職',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        raw_data: {
          chinese_name: '測試教授',
          english_name: 'Test Professor'
        }
      },
      admin: {
        id: '3',
        nycu_id: 'admin1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Test Admin',
        user_type: 'employee',
        status: '在職',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        raw_data: {
          chinese_name: '測試管理員',
          english_name: 'Test Admin'
        }
      }
    };

    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'User retrieved',
        data: userData[userRole]
      })
    });
  });

  // Mock logout endpoint
  await page.route('**/api/v1/auth/logout', (route) => {
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Logout successful'
      })
    });
  });
}

/**
 * Setup admin-specific mocks
 */
export async function setupAdminMocks(page: Page) {
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
    });
  });

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
    });
  });
}

/**
 * Setup student-specific mocks
 */
export async function setupStudentMocks(page: Page) {
  // Mock applications endpoint (empty initially)
  await page.route('**/api/v1/applications**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Applications retrieved',
          data: []
        })
      });
    } else if (route.request().method() === 'POST') {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Application created successfully',
          data: {
            id: 1,
            student_id: 'student1',
            scholarship_type: 'academic_excellence',
            status: 'submitted',
            created_at: '2025-01-01',
            updated_at: '2025-01-01'
          }
        })
      });
    }
  });

  // Mock scholarships endpoint
  await page.route('**/api/v1/scholarships**', (route) => {
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Scholarships retrieved',
        data: [
          {
            id: 'academic_excellence',
            name: '學術優秀獎學金',
            description: 'For students with excellent academic performance',
            amount: 10000,
            gpa_requirement: 3.8,
            is_active: true
          }
        ]
      })
    });
  });
}

 