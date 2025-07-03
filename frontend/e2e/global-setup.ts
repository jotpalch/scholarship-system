import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  // Only check server readiness in local development
  if (!process.env.CI && baseURL) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      // Wait for the server to be ready
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        try {
          await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 5000 });
          console.log('✅ Frontend server is ready');
          break;
        } catch (error) {
          attempts++;
          console.log(`⏳ Waiting for frontend server... (${attempts}/${maxAttempts})`);
          await page.waitForTimeout(2000);
        }
      }
      
      if (attempts === maxAttempts) {
        throw new Error('Frontend server failed to start in time');
      }
    } finally {
      await browser.close();
    }
  }
}

export default globalSetup; 