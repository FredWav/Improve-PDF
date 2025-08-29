/**
 * Basic API integration tests
 */

describe('API Integration Tests', () => {
  it('should have proper environment variables configured', () => {
    // Check that critical env vars are at least defined in .env file
    const fs = require('fs')
    const path = require('path')
    
    const envPath = path.join(process.cwd(), '.env')
    const envExists = fs.existsSync(envPath)
    
    expect(envExists).toBe(true)
    
    if (envExists) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      expect(envContent).toContain('OPENAI_API_KEY')
      expect(envContent).toContain('BLOB_READ_WRITE_TOKEN')
      expect(envContent).toContain('PEXELS_API_KEY')
      expect(envContent).toContain('UNSPLASH_ACCESS_KEY')
    }
  })

  it('should have all required API routes', () => {
    const fs = require('fs')
    const path = require('path')
    
    const apiDir = path.join(process.cwd(), 'app', 'api')
    
    // Check that all job processing routes exist
    const extractRoute = path.join(apiDir, 'jobs', 'extract', 'route.ts')
    const normalizeRoute = path.join(apiDir, 'jobs', 'normalize', 'route.ts')
    const rewriteRoute = path.join(apiDir, 'jobs', 'rewrite', 'route.ts')
    const imagesRoute = path.join(apiDir, 'jobs', 'images', 'route.ts')
    const renderRoute = path.join(apiDir, 'jobs', 'render', 'route.ts')
    
    expect(fs.existsSync(extractRoute)).toBe(true)
    expect(fs.existsSync(normalizeRoute)).toBe(true)
    expect(fs.existsSync(rewriteRoute)).toBe(true)
    expect(fs.existsSync(imagesRoute)).toBe(true)
    expect(fs.existsSync(renderRoute)).toBe(true)
  })

  it('should have UI components', () => {
    const fs = require('fs')
    const path = require('path')
    
    const componentsDir = path.join(process.cwd(), 'components')
    
    const uploadArea = path.join(componentsDir, 'UploadArea.tsx')
    const progressSteps = path.join(componentsDir, 'ProgressSteps.tsx')
    const downloadCard = path.join(componentsDir, 'DownloadCard.tsx')
    
    expect(fs.existsSync(uploadArea)).toBe(true)
    expect(fs.existsSync(progressSteps)).toBe(true)
    expect(fs.existsSync(downloadCard)).toBe(true)
  })
})