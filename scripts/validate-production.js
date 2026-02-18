#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * Run before deploying to production to catch configuration issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let hasErrors = false;
let hasWarnings = false;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function error(message) {
  log(`❌ ${message}`, RED);
  hasErrors = true;
}

function warning(message) {
  log(`⚠️  ${message}`, YELLOW);
  hasWarnings = true;
}

function success(message) {
  log(`✅ ${message}`, GREEN);
}

function info(message) {
  log(`ℹ️  ${message}`, BLUE);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    success(`${description} exists`);
    return true;
  } else {
    error(`${description} missing: ${filePath}`);
    return false;
  }
}

function checkEnvVar(envFile, varName, required = true) {
  const content = fs.readFileSync(envFile, 'utf-8');
  const regex = new RegExp(`^${varName}\\s*=\\s*(.+)$`, 'm');
  const match = content.match(regex);
  
  if (!match) {
    if (required) {
      error(`${varName} not found in ${envFile}`);
    } else {
      warning(`${varName} optional but not set in ${envFile}`);
    }
    return false;
  }
  
  const value = match[1].trim();
  
  // Check for placeholder values
  if (value.includes('your_') || value.includes('your-') || 
      value.includes('CHANGE_ME') || value === 'change-this-to-a-secure-random-value-min-32-chars') {
    error(`${varName} still has placeholder value in ${envFile}`);
    return false;
  }
  
  // Check minimum length for secrets
  if (varName.includes('SECRET') || varName.includes('ENCRYPTION_KEY')) {
    if (value.length < 32) {
      error(`${varName} too short (${value.length} chars, need >= 32)`);
      return false;
    }
  }
  
  // Check ENCRYPTION_KEY format
  if (varName === 'ENCRYPTION_KEY') {
    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
      error(`${varName} must be exactly 64 hex characters`);
      return false;
    }
  }
  
  success(`${varName} configured in ${envFile}`);
  return true;
}

function runCommand(command, description) {
  try {
    execSync(command, { stdio: 'ignore' });
    success(description);
    return true;
  } catch {
    error(description + ' failed');
    return false;
  }
}

console.log('\n');
log('═'.repeat(60), BLUE);
log('    MessageSender Production Readiness Validation', BLUE);
log('═'.repeat(60), BLUE);
console.log('\n');

// Check Node.js version
info('Checking Node.js version...');
const nodeVersion = process.version;
if (nodeVersion.startsWith('v20.')) {
  success(`Node.js ${nodeVersion} (20.x LTS)`);
} else {
  warning(`Node.js ${nodeVersion} — recommend 20.x LTS`);
}

// Check pnpm
info('\nChecking pnpm...');
try {
  const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
  success(`pnpm ${pnpmVersion}`);
} catch {
  error('pnpm not installed — run: npm install -g pnpm');
}

// Check Docker
info('\nChecking Docker...');
try {
  const dockerVersion = execSync('docker --version', { encoding: 'utf-8' }).trim();
  success(dockerVersion);
} catch {
  warning('Docker not installed — required for containerized deployment');
}

// Check files
info('\nChecking required files...');
checkFile('backend/.env', 'Backend .env');
checkFile('frontend/.env.local', 'Frontend .env.local');
checkFile('backend/Dockerfile', 'Backend Dockerfile');
checkFile('frontend/Dockerfile', 'Frontend Dockerfile');
checkFile('docker-compose.yml', 'Docker Compose development');
checkFile('docker-compose.prod.yml', 'Docker Compose production');
checkFile('.dockerignore', '.dockerignore');
checkFile('.gitignore', '.gitignore');
checkFile('docs/DEPLOYMENT.md', 'Deployment documentation');
checkFile('docs/PRODUCTION_CHECKLIST.md', 'Production checklist');
checkFile('SECURITY.md', 'Security policy');

// Check backend .env
if (fs.existsSync('backend/.env')) {
  info('\nValidating backend/.env...');
  checkEnvVar('backend/.env', 'DATABASE_URL');
  checkEnvVar('backend/.env', 'JWT_SECRET');
  checkEnvVar('backend/.env', 'JWT_REFRESH_SECRET');
  checkEnvVar('backend/.env', 'ENCRYPTION_KEY');
  checkEnvVar('backend/.env', 'FACEBOOK_APP_ID');
  checkEnvVar('backend/.env', 'FACEBOOK_APP_SECRET');
  checkEnvVar('backend/.env', 'FACEBOOK_WEBHOOK_VERIFY_TOKEN');
  checkEnvVar('backend/.env', 'REDIS_HOST');
  checkEnvVar('backend/.env', 'FRONTEND_URL');
  checkEnvVar('backend/.env', 'SENTRY_DSN', false);
}

// Check frontend .env.local
if (fs.existsSync('frontend/.env.local')) {
  info('\nValidating frontend/.env.local...');
  checkEnvVar('frontend/.env.local', 'NEXT_PUBLIC_API_URL');
  checkEnvVar('frontend/.env.local', 'NEXT_PUBLIC_SOCKET_URL');
  checkEnvVar('frontend/.env.local', 'NEXT_PUBLIC_FACEBOOK_APP_ID');
}

// Check git status
info('\nChecking git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  const envFiles = gitStatus.split('\n').filter(line => 
    line.includes('.env') && !line.includes('.env.example') && !line.includes('.env.prod.example')
  );
  
  if (envFiles.length > 0) {
    error('Environment files in git staging:');
    envFiles.forEach(file => console.log(`  ${file}`));
  } else {
    success('No .env files in git staging');
  }
} catch {
  warning('Not a git repository or git not installed');
}

// Check dependencies
info('\nChecking dependencies...');
if (fs.existsSync('node_modules')) {
  success('Root dependencies installed');
} else {
  warning('Root dependencies not installed — run: pnpm install');
}

if (fs.existsSync('backend/node_modules')) {
  success('Backend dependencies installed');
} else {
  warning('Backend dependencies not installed');
}

if (fs.existsSync('frontend/node_modules')) {
  success('Frontend dependencies installed');
} else {
  warning('Frontend dependencies not installed');
}

// Check Prisma
info('\nChecking Prisma...');
if (fs.existsSync('backend/node_modules/.prisma/client')) {
  success('Prisma client generated');
} else {
  warning('Prisma client not generated — run: pnpm db:generate');
}

// Build test (dry run)
info('\nChecking if builds would succeed...');
if (fs.existsSync('backend/dist')) {
  success('Backend build artifacts present');
} else {
  info('Backend not built — will build fresh on deployment');
}

if (fs.existsSync('frontend/.next')) {
  success('Frontend build artifacts present');
} else {
  info('Frontend not built — will build fresh on deployment');
}

// Security checks
info('\nSecurity checks...');
if (fs.existsSync('backend/.env')) {
  const backendEnv = fs.readFileSync('backend/.env', 'utf-8');
  if (backendEnv.includes('localhost') && backendEnv.includes('NODE_ENV=production')) {
    warning('backend/.env has NODE_ENV=production but uses localhost URLs');
  }
}

// Docker checks
if (fs.existsSync('.env.prod')) {
  info('\nProduction environment (.env.prod)...');
  checkEnvVar('.env.prod', 'POSTGRES_PASSWORD');
  checkEnvVar('.env.prod', 'REDIS_PASSWORD');
  checkEnvVar('.env.prod', 'JWT_SECRET');
  checkEnvVar('.env.prod', 'JWT_REFRESH_SECRET');
  checkEnvVar('.env.prod', 'ENCRYPTION_KEY');
  checkEnvVar('.env.prod', 'FRONTEND_URL');
  checkEnvVar('.env.prod', 'NEXT_PUBLIC_API_URL');
} else {
  warning('.env.prod not found — create from .env.prod.example for production deployment');
}

// Summary
console.log('\n');
log('═'.repeat(60), BLUE);
log('                  Validation Summary', BLUE);
log('═'.repeat(60), BLUE);
console.log('\n');

if (hasErrors) {
  log('❌ FAILED — Fix errors before deploying to production', RED);
  process.exit(1);
} else if (hasWarnings) {
  log('⚠️  PASSED WITH WARNINGS — Review warnings before production deployment', YELLOW);
  process.exit(0);
} else {
  log('✅ ALL CHECKS PASSED — Ready for production deployment!', GREEN);
  process.exit(0);
}
