// @ts-nocheck
import { test, expect, Page } from '@playwright/test'

// Assumes test user stu_phd exists and system seeded.

test.describe('Scholarship Category Selection', () => {
  test('student selects category and sub-type in new application form', async ({ page }: { page: Page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('input[name="username"]', 'stu_phd')
    await page.fill('input[name="password"]', 'stuphd123')
    await page.click('button[type="submit"]')

    // Go to student dashboard
    await page.goto('/student/dashboard')

    // Switch to New Application tab
    await page.getByRole('tab', { name: /new application/i }).click()

    // Wait categories dropdown
    const categorySelect = page.getByLabel(/Scholarship Category|獎學金大類/) // using label
    await expect(categorySelect).toBeVisible()

    // Open dropdown and choose PhD category
    await categorySelect.click()
    await page.getByRole('option', { name: /博士獎學金/ }).click()

    // Sub-type dropdown should now be populated
    const subTypeSelect = page.getByLabel(/Scholarship Sub-type|獎學金子類/)
    await subTypeSelect.click()

    // Ensure both NSC & MOE options appear
    await expect(page.getByRole('option', { name: /國科會博士生獎學金|NSTC PhD Scholarship/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /教育部博士生獎學金|MOE PhD Scholarship/ })).toBeVisible()

    // Choose NSC
    await page.getByRole('option', { name: /國科會博士生獎學金|NSTC PhD Scholarship/ }).click()

    // Verify it is selected
    await expect(subTypeSelect).toHaveText(/博士生/)
  })
})