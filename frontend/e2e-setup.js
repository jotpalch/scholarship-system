#!/usr/bin/env node

/**
 * E2E Test Environment Setup and Validation
 * Ensures all prerequisites are met before running Playwright tests
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  frontendUrl: 'http://localhost:3000',
  maxRetries: 30,
  retryDelay: 2000,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Logging functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔧 ${msg}${colors.reset}`),
};

// Check if a port is in use
async function isPortInUse(port) {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  try {
    // Try different methods based on OS
    if (process.platform === 'win32') {
      await execAsync(`netstat -an | findstr :${port}`);
    } else {
      await execAsync(`lsof -Pi :${port} -sTCP:LISTEN -t`);
    }
    return true;
  } catch {
    return false;
  }
}

// Wait for a service to be ready
async function waitForService(url, name, maxRetries = config.maxRetries) {
  log.info(`Waiting for ${name} to be ready...`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) 
      });
      
      if (response.ok) {
        log.success(`${name} is ready`);
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    console.log(`   Attempt ${attempt}/${maxRetries}...`);
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    }
  }
  
  log.error(`${name} failed to start within timeout`);
  return false;
}

// Check backend API health
async function checkApiHealth() {
  log.step('Checking API health...');
  
  try {
    const response = await fetch(`${config.apiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      log.success('API health check passed');
      console.log('   API Status:', data);
      return true;
    } else {
      log.error(`API health check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    log.error(`API health check failed: ${error.message}`);
    return false;
  }
}

// Start backend server if not running
async function startBackend() {
  log.step('Starting backend server...');
  
  const backendPath = path.join(__dirname, '..', 'backend');
  
  try {
    await fs.access(backendPath);
  } catch {
    log.error('Backend directory not found');
    return false;
  }
  
  return new Promise((resolve) => {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const backend = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'], {
      cwd: backendPath,
      env: {
        ...process.env,
        DATABASE_URL: 'sqlite:///./test.db',
        PYTHONPATH: backendPath,
      },
      stdio: 'pipe'
    });
    
    backend.stdout.on('data', (data) => {
      if (data.toString().includes('Application startup complete')) {
        resolve(true);
      }
    });
    
    backend.stderr.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });
    
    backend.on('error', (error) => {
      log.error(`Failed to start backend: ${error.message}`);
      resolve(false);
    });
    
    // Save PID for cleanup
    if (backend.pid) {
      fs.writeFile(path.join(__dirname, '..', 'backend.pid'), backend.pid.toString())
        .catch(() => {/* ignore errors */});
    }
    
    // Timeout after 30 seconds
    setTimeout(() => {
      log.error('Backend startup timeout');
      resolve(false);
    }, 30000);
  });
}

// Validate test environment
async function validateEnvironment() {
  log.info('Validating E2E test environment...');
  
  // Check if required files exist
  const requiredFiles = [
    'playwright.config.ts',
    'package.json',
    'test-api-connection.js',
  ];
  
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(__dirname, file));
      log.success(`Found ${file}`);
    } catch {
      log.error(`Missing required file: ${file}`);
      return false;
    }
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    log.success(`Node.js version: ${nodeVersion}`);
  } else {
    log.error(`Node.js version ${nodeVersion} is too old. Minimum required: 18`);
    return false;
  }
  
  return true;
}

// Setup complete test environment
async function setupTestEnvironment() {
  log.info('🎭 Setting up E2E Test Environment');
  console.log('=====================================');
  
  // Validate environment
  if (!(await validateEnvironment())) {
    log.error('Environment validation failed');
    process.exit(1);
  }
  
  // Check backend
  const backendRunning = await isPortInUse(8000);
  
  if (!backendRunning) {
    log.warning('Backend not running, attempting to start...');
    
    if (!(await startBackend())) {
      log.error('Failed to start backend');
      log.info('Please start the backend manually:');
      console.log('   cd backend && python -m uvicorn app.main:app --reload');
      process.exit(1);
    }
  } else {
    log.success('Backend detected on port 8000');
  }
  
  // Wait for API to be ready
  if (!(await waitForService(`${config.apiUrl}/health`, 'Backend API'))) {
    log.error('Backend API not responding');
    process.exit(1);
  }
  
  // Check API health
  if (!(await checkApiHealth())) {
    log.error('API health check failed');
    process.exit(1);
  }
  
  // Check frontend (optional, Playwright can start it)
  const frontendRunning = await isPortInUse(3000);
  
  if (frontendRunning) {
    log.success('Frontend detected on port 3000');
  } else {
    log.info('Frontend not running - Playwright will start it');
  }
  
  log.success('E2E test environment is ready!');
  console.log('');
  console.log('🔧 Configuration:');
  console.log(`   API URL: ${config.apiUrl}`);
  console.log(`   Frontend URL: ${config.frontendUrl}`);
  console.log(`   Backend Running: ${backendRunning ? 'Yes' : 'Started by script'}`);
  console.log(`   Frontend Running: ${frontendRunning ? 'Yes' : 'Will be started by Playwright'}`);
  
  return true;
}

// Run setup if called directly
if (require.main === module) {
  setupTestEnvironment().catch((error) => {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  setupTestEnvironment,
  checkApiHealth,
  waitForService,
  isPortInUse,
  config,
}; 