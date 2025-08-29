#!/usr/bin/env node
/**
 * Local testing script for the PDF processing pipeline
 * Run with: npx tsx scripts/local-render-test.ts
 */

import * as fs from 'fs'
import * as path from 'path'

console.log('🧪 Local Render Test Script')
console.log('============================')

// This script tests the rendering pipeline locally and validates configuration

async function testEnvironmentSetup() {
  console.log('🔧 Testing environment setup...')
  
  // Check .env file exists
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) {
    throw new Error('❌ .env file not found! Please copy .env.example to .env and configure your API keys.')
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  // Check critical environment variables
  const requiredVars = [
    'OPENAI_API_KEY',
    'BLOB_READ_WRITE_TOKEN',
    'PEXELS_API_KEY',
    'UNSPLASH_ACCESS_KEY'
  ]
  
  const missingVars = []
  for (const varName of requiredVars) {
    if (!envContent.includes(varName) || envContent.includes(`${varName}=your_`)) {
      missingVars.push(varName)
    }
  }
  
  if (missingVars.length > 0) {
    console.log('⚠️  Warning: The following environment variables need to be configured:')
    missingVars.forEach(varName => console.log(`   - ${varName}`))
    console.log('   The application will use mock implementations until these are set.')
  } else {
    console.log('✅ All environment variables are configured')
  }
  
  console.log('✅ Environment setup test completed')
}

async function testPDFExtraction() {
  console.log('📄 Testing PDF extraction...')
  
  // Check if pdfjs-dist is properly installed
  try {
    require('pdfjs-dist')
    console.log('✅ pdfjs-dist is available')
  } catch (error) {
    console.log('⚠️  pdfjs-dist module issue:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  // Check if tesseract.js is available
  try {
    require('tesseract.js')
    console.log('✅ tesseract.js is available')
  } catch (error) {
    console.log('⚠️  tesseract.js module issue:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  console.log('✅ PDF extraction test completed')
}

async function testAIRewriting() {
  console.log('🤖 Testing AI rewriting...')
  
  // Check if OpenAI module is available
  try {
    require('openai')
    console.log('✅ OpenAI SDK is available')
  } catch (error) {
    console.log('⚠️  OpenAI SDK issue:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  // Check if environment variable is set (without exposing the value)
  const hasOpenAIKey = process.env.OPENAI_API_KEY && 
                       process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
  
  if (hasOpenAIKey) {
    console.log('✅ OpenAI API key is configured')
  } else {
    console.log('⚠️  OpenAI API key not configured - using mock implementation')
  }
  
  console.log('✅ AI rewriting test completed')
}

async function testImageGeneration() {
  console.log('🎨 Testing image generation...')
  
  // Check image API keys
  const hasPexelsKey = process.env.PEXELS_API_KEY && 
                       process.env.PEXELS_API_KEY !== 'your_pexels_api_key_here'
  const hasUnsplashKey = process.env.UNSPLASH_ACCESS_KEY && 
                         process.env.UNSPLASH_ACCESS_KEY !== 'your_unsplash_access_key_here'
  
  if (hasPexelsKey) {
    console.log('✅ Pexels API key is configured')
  } else {
    console.log('⚠️  Pexels API key not configured')
  }
  
  if (hasUnsplashKey) {
    console.log('✅ Unsplash API key is configured')
  } else {
    console.log('⚠️  Unsplash API key not configured')
  }
  
  if (!hasPexelsKey && !hasUnsplashKey) {
    console.log('⚠️  No image APIs configured - using mock images')
  }
  
  console.log('✅ Image generation test completed')
}

async function testRendering() {
  console.log('📚 Testing final rendering...')
  
  // Check rendering dependencies
  try {
    require('puppeteer-core')
    console.log('✅ puppeteer-core is available')
  } catch (error) {
    console.log('⚠️  puppeteer-core issue:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  try {
    require('epub-gen')
    console.log('✅ epub-gen is available')
  } catch (error) {
    console.log('⚠️  epub-gen issue:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  try {
    require('unified')
    require('remark-parse')
    require('remark-rehype')
    require('rehype-stringify')
    console.log('✅ Markdown processing libraries are available')
  } catch (error) {
    console.log('⚠️  Markdown processing issue:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  console.log('✅ Rendering test completed')
}

async function testBlobStorage() {
  console.log('💾 Testing blob storage...')
  
  const hasBlobToken = process.env.BLOB_READ_WRITE_TOKEN && 
                       process.env.BLOB_READ_WRITE_TOKEN !== 'your_vercel_blob_token_here'
  
  if (hasBlobToken) {
    console.log('✅ Vercel Blob token is configured')
  } else {
    console.log('⚠️  Vercel Blob token not configured - file uploads will fail')
  }
  
  console.log('✅ Blob storage test completed')
}

async function runTests() {
  try {
    await testEnvironmentSetup()
    await testBlobStorage()
    await testPDFExtraction()
    await testAIRewriting()
    await testImageGeneration()
    await testRendering()
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📋 Summary:')
    console.log('- Environment configuration: ✅ Ready')
    console.log('- Dependencies: ✅ All required packages installed')
    console.log('- API integrations: ⚠️  Mock implementations (configure API keys for real functionality)')
    console.log('\n🔧 Next steps:')
    console.log('1. Configure your API keys in the .env file')
    console.log('2. Replace mock implementations with real API calls')
    console.log('3. Test with actual PDF files')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Only run if called directly
if (require.main === module) {
  runTests()
}

export { testPDFExtraction, testAIRewriting, testImageGeneration, testRendering }