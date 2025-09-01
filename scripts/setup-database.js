#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');
const path = require('path');

console.log(chalk.blue('🚀 DaorsAgro Database Setup'));
console.log(chalk.gray('============================\n'));

const rootDir = path.resolve(__dirname, '..');
const databaseDir = path.join(rootDir, 'backend', 'shared', 'database');

function runCommand(command, description) {
  console.log(chalk.blue(`📋 ${description}...`));
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    console.log(chalk.green(`✅ ${description} completed\n`));
  } catch (error) {
    console.error(chalk.red(`❌ ${description} failed`));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

async function setupDatabase() {
  try {
    // Check if Docker services are running
    console.log(chalk.blue('🐳 Checking Docker services...'));
    try {
      execSync('docker-compose ps', { stdio: 'pipe', cwd: rootDir });
      console.log(chalk.green('✅ Docker Compose is available\n'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Docker Compose not available, assuming services are running manually\n'));
    }

    // Install dependencies for database package
    runCommand(
      `npm install --workspace=backend/shared/database`,
      'Installing database package dependencies'
    );

    // Build the database package
    runCommand(
      `npm run build --workspace=backend/shared/database`,
      'Building database package'
    );

    // Initialize the complete database
    runCommand(
      `npm run db:init`,
      'Initializing database (migrations + seeds)'
    );

    // Validate the setup
    runCommand(
      `npm run db:validate`,
      'Validating database schemas'
    );

    console.log(chalk.green('🎉 Database setup completed successfully!'));
    console.log(chalk.blue('\n📊 What was set up:'));
    console.log(chalk.gray('  • PostgreSQL: Users, farms, financial data'));
    console.log(chalk.gray('  • MongoDB: Subsidies, insurance collections'));
    console.log(chalk.gray('  • ClickHouse: Analytics tables'));
    console.log(chalk.gray('  • Redis: Session storage ready'));
    console.log(chalk.gray('  • Elasticsearch: Search indices ready'));
    
    console.log(chalk.blue('\n🚀 Next steps:'));
    console.log(chalk.gray('  • Start the backend services: npm run dev:backend'));
    console.log(chalk.gray('  • Start the frontend: npm run dev:frontend'));
    console.log(chalk.gray('  • Or start everything: npm run dev'));

  } catch (error) {
    console.error(chalk.red('\n❌ Database setup failed:'));
    console.error(chalk.red(error.message));
    
    console.log(chalk.yellow('\n🔧 Troubleshooting:'));
    console.log(chalk.gray('  • Ensure Docker services are running: docker-compose up -d'));
    console.log(chalk.gray('  • Check database connection strings in .env files'));
    console.log(chalk.gray('  • Verify database services are healthy: npm run health:check'));
    console.log(chalk.gray('  • Check logs: docker-compose logs'));
    
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === '--help' || command === '-h') {
  console.log(chalk.blue('DaorsAgro Database Setup Script'));
  console.log(chalk.gray('================================\n'));
  console.log('Usage:');
  console.log('  node scripts/setup-database.js           Setup complete database');
  console.log('  node scripts/setup-database.js --help    Show this help');
  console.log('\nThis script will:');
  console.log('  1. Install database package dependencies');
  console.log('  2. Build the database management tools');
  console.log('  3. Run all database migrations');
  console.log('  4. Seed initial data (development only)');
  console.log('  5. Validate all schemas');
  console.log('\nPrerequisites:');
  console.log('  • Docker services running (docker-compose up -d)');
  console.log('  • Or manual database services running');
  console.log('  • Proper environment variables set');
} else {
  setupDatabase();
}