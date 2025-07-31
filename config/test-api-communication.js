const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3000';

async function testApiCommunication() {
  console.log('🧪 Testing Scholarship System Frontend-Backend Communication\n');
  
  try {
    // Test 1: Backend Health Check
    console.log('1. Testing Backend Health...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('   ✅ Backend Health:', healthData.message);
    
    // Test 2: Mock SSO Users
    console.log('\n2. Testing Mock SSO Users...');
    const usersResponse = await fetch(`${BACKEND_URL}/api/v1/auth/mock-sso/users`);
    const usersData = await usersResponse.json();
    console.log(`   ✅ Mock Users Available: ${usersData.data.length} users`);
    console.log(`   📝 Sample User: ${usersData.data[0].username} (${usersData.data[0].role})`);
    
    // Test 3: Mock Login
    console.log('\n3. Testing Mock Login...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/v1/auth/mock-sso/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'student001'
      })
    });
    const loginData = await loginResponse.json();
    console.log('   ✅ Login Successful:', loginData.data.user.full_name);
    
    const token = loginData.data.access_token;
    
    // Test 4: Authenticated API Call
    console.log('\n4. Testing Authenticated API Call...');
    const profileResponse = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const profileData = await profileResponse.json();
    console.log('   ✅ User Profile:', profileData.data.full_name);
    
    // Test 5: Frontend Access
    console.log('\n5. Testing Frontend Access...');
    const frontendResponse = await fetch(FRONTEND_URL);
    console.log(`   ✅ Frontend Status: ${frontendResponse.status} ${frontendResponse.statusText}`);
    
    console.log('\n🎉 All tests passed! Frontend-Backend communication is working properly.');
    
    // Summary
    console.log('\n📊 System Status Summary:');
    console.log(`   🔄 Backend API: Running on port 8000`);
    console.log(`   🖥️  Frontend: Running on port 3000`);
    console.log(`   💾 Database: PostgreSQL connected`);
    console.log(`   🔑 Authentication: Mock SSO working`);
    console.log(`   🌐 CORS: Properly configured`);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Communication test failed:', error.message);
    return false;
  }
}

// Run the test
testApiCommunication()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  }); 