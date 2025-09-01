const http = require('http');

// Test function to verify server is running
function testServer() {
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Server is running and healthy!');
        console.log('Response:', response);
      } catch (error) {
        console.error('❌ Failed to parse server response:', error);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Failed to connect to server:', error.message);
  });

  req.on('timeout', () => {
    console.error('❌ Server connection timed out');
    req.destroy();
  });

  req.end();
}

// Test API version endpoint
function testApiVersion() {
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/version',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ API version endpoint is working!');
        console.log('Response:', response);
      } catch (error) {
        console.error('❌ Failed to parse API version response:', error);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Failed to connect to API version endpoint:', error.message);
  });

  req.on('timeout', () => {
    console.error('❌ API version endpoint connection timed out');
    req.destroy();
  });

  req.end();
}

// Run tests
console.log('🧪 Starting server tests...');
testServer();
setTimeout(testApiVersion, 1000);