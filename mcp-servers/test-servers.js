#!/usr/bin/env node

/**
 * Test script to verify MCP servers can start and respond to basic requests
 */

const { spawn } = require('child_process');
const path = require('path');

const servers = [
  { name: 'database-server', file: 'database-server.js' },
  { name: 'api-server', file: 'api-server.js' },
  { name: 'filesystem-server', file: 'filesystem-server.js' },
  { name: 'code-analysis-server', file: 'code-analysis-server.js' },
  { name: 'agricultural-server', file: 'agricultural-server.js' },
];

async function testServer(serverConfig) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing ${serverConfig.name}...`);

    const serverPath = path.join(__dirname, serverConfig.file);
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(__dirname), // Project root
    });

    let output = '';
    let errorOutput = '';
    let started = false;

    // Set a timeout for the test
    const timeout = setTimeout(() => {
      serverProcess.kill();
      reject(new Error(`${serverConfig.name} test timed out`));
    }, 10000); // 10 second timeout

    serverProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;

      if (dataStr.includes('running on stdio') && !started) {
        started = true;
        console.log(`✅ ${serverConfig.name} started successfully`);

        // Give it a moment to fully initialize
        setTimeout(() => {
          serverProcess.kill('SIGINT');
          clearTimeout(timeout);
          resolve({
            name: serverConfig.name,
            success: true,
            output: output.trim(),
          });
        }, 2000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    serverProcess.on('close', (code) => {
      clearTimeout(timeout);

      if (!started) {
        reject(new Error(`${serverConfig.name} failed to start (exit code: ${code})\nError: ${errorOutput}`));
      }
    });

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`${serverConfig.name} process error: ${error.message}`));
    });
  });
}

async function runTests() {
  console.log('🚀 Starting MCP Servers Test Suite');
  console.log('=====================================');

  const results = {
    passed: 0,
    failed: 0,
    total: servers.length,
    details: [],
  };

  for (const server of servers) {
    try {
      const result = await testServer(server);
      results.passed++;
      results.details.push({
        name: server.name,
        status: 'PASSED',
        message: 'Server started successfully',
      });
    } catch (error) {
      results.failed++;
      results.details.push({
        name: server.name,
        status: 'FAILED',
        message: error.message,
      });
      console.log(`❌ ${server.name} failed: ${error.message}`);
    }
  }

  // Print summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Total Servers: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed === 0) {
    console.log('\n🎉 All MCP servers passed the startup test!');
    console.log('\nNext steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Start all servers: npm run start:all');
    console.log('3. Configure your MCP client to connect to the servers');
  } else {
    console.log('\n⚠️  Some servers failed to start. Check the error messages above.');
    console.log('\nTroubleshooting:');
    console.log('1. Ensure Node.js version is 18+');
    console.log('2. Install dependencies: npm install');
    console.log('3. Check file permissions');
    console.log('4. Verify no port conflicts');
  }

  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.details.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
  });

  process.exit(results.failed === 0 ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(1);
});

if (require.main === module) {
  runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testServer, runTests };