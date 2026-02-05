#!/usr/bin/env node

/**
 * Pre-build optimization script
 * Run this before `next build` to optimize the build process
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔧 Running pre-build optimizations...\n')

// 1. Clean old build cache
console.log('🧹 Cleaning old build cache...')
try {
  const buildDir = path.join(__dirname, '..', '.next')
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true })
    console.log('   ✓ Cleaned .next directory')
  }
} catch (e) {
  console.log('   ⚠ Could not clean .next directory')
}

// 2. Verify environment
console.log('\n📋 Checking environment...')
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET']
const missing = requiredEnvVars.filter(v => !process.env[v])
if (missing.length > 0) {
  console.log(`   ⚠ Missing env vars: ${missing.join(', ')}`)
} else {
  console.log('   ✓ Environment variables OK')
}

// 3. Generate Prisma client
console.log('\n🗄 Generating Prisma client...')
try {
  execSync('npx prisma generate', { stdio: 'inherit' })
  console.log('   ✓ Prisma client generated')
} catch (e) {
  console.error('   ✗ Failed to generate Prisma client')
  process.exit(1)
}

// 4. Type check
console.log('\n🔍 Running type check...')
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' })
  console.log('   ✓ Type check passed')
} catch (e) {
  console.error('   ✗ Type check failed')
  process.exit(1)
}

// 5. Optimize images (if any in public folder)
console.log('\n🖼 Checking public assets...')
const publicDir = path.join(__dirname, '..', 'public')
if (fs.existsSync(publicDir)) {
  const files = fs.readdirSync(publicDir)
  console.log(`   ✓ Found ${files.length} public assets`)
}

console.log('\n✅ Pre-build optimizations complete!')
console.log('   Run "npm run build" to start the build.\n')
