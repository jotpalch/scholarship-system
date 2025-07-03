# E2E Testing with Playwright

This directory contains end-to-end tests for the Scholarship Management System using Playwright.

## Quick Start

```bash
# Install dependencies and run all tests
./run-e2e-tests.sh

# Run specific test file
./run-e2e-tests.sh specific auth.spec.ts

# Debug mode (opens browser)
./run-e2e-tests.sh debug

# Interactive UI mode
./run-e2e-tests.sh ui
```

## Test Structure

```
e2e/
├── pages/                     # Page Object Models
│   ├── login-page.ts         # Login form interactions
│   └── admin-dashboard-page.ts # Admin dashboard interactions
├── admin-dashboard.spec.ts    # Admin functionality tests
├── auth.spec.ts              # Authentication tests
├── student-workflow.spec.ts   # Student application workflow
├── global-setup.ts           # Global test setup
└── README.md                 # This file
```

## Page Object Models

We use the Page Object Model pattern to make tests more maintainable:

```typescript
// Example usage
import { LoginPage } from './pages/login-page'

test('login test', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('username', 'password')
})
```

## Configuration

Key configuration in `playwright.config.ts`:

- **Timeout**: 60 seconds for each test
- **Retries**: 2 retries on CI, 0 locally
- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:3000
- **Global Setup**: Ensures server readiness

## Troubleshooting

### Common Issues

#### 1. Tests Timeout on Login
**Symptoms**: Tests fail with "Test timeout of 30000ms exceeded" while filling login form

**Solutions**:
- Ensure frontend server is running on port 3000
- Check that login form elements use correct selectors:
  - Username: `#username`
  - Password: `#password` 
  - Submit: `button[type="submit"]`
- Use page object models for reliable element selection

#### 2. Server Not Ready
**Symptoms**: "page.goto" fails or takes too long

**Solutions**:
```bash
# Check if frontend is running
curl http://localhost:3000

# Start frontend manually
cd frontend && npm run dev

# Use the test runner which handles this
./run-e2e-tests.sh
```

#### 3. Port Conflicts
**Symptoms**: Server fails to start or tests can't connect

**Solutions**:
```bash
# Check what's using the ports
lsof -i :3000 :8000

# Kill processes if needed
pkill -f "next"
pkill -f "node"
```

#### 4. Selector Issues
**Symptoms**: "Element not found" or "locator timed out"

**Solutions**:
- Use data-testid attributes when possible
- Prefer text content selectors for stability
- Wait for elements to be visible before interaction
- Use the page object models provided

### Debug Strategies

#### 1. Visual Debugging
```bash
# Run tests in headed mode (see browser)
./run-e2e-tests.sh headed

# Debug specific test
./run-e2e-tests.sh debug
```

#### 2. Screenshots and Traces
After test failure, check:
- `test-results/` directory for screenshots
- Trace files for step-by-step replay

#### 3. Slow Motion
Add to test configuration:
```typescript
use: {
  launchOptions: {
    slowMo: 1000 // 1 second delay between actions
  }
}
```

### Environment Variables

```bash
# Reuse existing server (faster test runs)
export PLAYWRIGHT_REUSE_SERVER=true

# Run in CI mode
export CI=true

# Debug mode
export DEBUG=pw:api
```

## Writing New Tests

### 1. Use Page Object Models
```typescript
// Create page objects for new pages
export class NewPage {
  readonly page: Page;
  readonly importantElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.importantElement = page.locator('[data-testid="important"]');
  }

  async performAction() {
    await this.importantElement.click();
  }
}
```

### 2. Mock API Responses
```typescript
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/endpoint', (route) => {
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockData
      })
    });
  });
});
```

### 3. Wait for Elements
```typescript
// Wait for element to be visible
await expect(page.locator('text=Expected')).toBeVisible();

// Wait for network requests to complete
await page.waitForLoadState('networkidle');

// Custom wait conditions
await page.waitForFunction(() => window.dataLoaded === true);
```

### 4. Test Best Practices

- **Use descriptive test names**: `'should display error when invalid credentials provided'`
- **One assertion per test concept**: Don't test multiple features in one test
- **Clean state**: Each test should be independent
- **Use data-testid**: For elements that might change styling
- **Mock external dependencies**: API calls, file uploads, etc.

## Performance Considerations

- Tests run in parallel by default
- Use `fullyParallel: true` for faster execution
- Avoid unnecessary waits with `page.waitForTimeout()`
- Prefer `expect().toBeVisible()` over manual timeouts

## CI/CD Integration

The tests are configured to work in both local and CI environments:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    cd frontend
    npm install
    npx playwright install
    npx playwright test
```

## Maintenance

### Regular Tasks
1. Update browser versions: `npx playwright install`
2. Review test timeouts if app becomes slower
3. Update selectors when UI changes
4. Add new page objects for new features

### When Tests Fail
1. Check if it's a real regression
2. Update selectors if UI changed
3. Update mock data if API changed
4. Verify test logic is still valid

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices) 