import { NextRequest, NextResponse } from 'next/server'
import { updateStepStatus, addJobLog, saveProcessingData } from '../../../../lib/status'
import { getText } from '../../../../lib/blob'

export async function POST(request: NextRequest) {
  try {
    const { jobId, inputUrl } = await request.json()

    if (!jobId || !inputUrl) {
      return NextResponse.json(
        { error: 'Job ID and input URL are required' },
        { status: 400 }
      )
    }

    await addJobLog(jobId, 'info', `Starting image generation`)

    try {
      // Get the improved text
      const improvedText = await getText(inputUrl)

      // TODO: Implement actual image generation
      // - Analyze text for concepts (1 image per 800-1200 words)
      // - Try OpenAI Images first, then Pexels, then Unsplash
      // - Track licensing information
      
      // Simulate image processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock image generation
      const wordCount = improvedText.split(/\s+/).length
      const imageCount = Math.max(1, Math.floor(wordCount / 1000))
      
      const mockImages = Array.from({ length: imageCount }, (_, i) => ({
        id: `img-${i + 1}`,
        url: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800`, // Placeholder
        alt: `Illustration ${i + 1}`,
        caption: `Figure ${i + 1}: Conceptual illustration`,
        source: 'unsplash',
        license: 'Unsplash License',
        author: 'Sample Author',
        authorUrl: 'https://unsplash.com/@author'
      }))

      // Create enhanced text with image placeholders
      const textWithImages = improvedText + '\n\n' + mockImages.map(img => 
        `![${img.alt}](${img.url})\n*${img.caption}*\n`
      ).join('\n')

      // Save enhanced text with images
      const outputUrl = await saveProcessingData(jobId, 'images', textWithImages, 'with-images.md')

      // Save licensing information
      const licensingInfo = {
        images: mockImages,
        totalImages: mockImages.length,
        sources: {
          openai: 0,
          pexels: 0,
          unsplash: mockImages.length
        },
        attribution: mockImages.map(img => ({
          url: img.url,
          author: img.author,
          source: img.source,
          license: img.license
        }))
      }

      await saveProcessingData(jobId, 'images', JSON.stringify(licensingInfo, null, 2), 'licensing.json')

      // Update step status to completed
      await updateStepStatus(jobId, 'images', 'COMPLETED', `Image generation completed (${mockImages.length} images added)`)

      // Start final step - rendering
      await updateStepStatus(jobId, 'render', 'RUNNING', 'Starting final rendering')

      // Trigger render job
      try {
        await fetch(`${request.nextUrl.origin}/api/jobs/render`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId,
            inputUrl: outputUrl
          })
        })
      } catch (error) {
        console.error('Failed to trigger render job:', error)
        await updateStepStatus(jobId, 'render', 'FAILED', `Failed to start render: ${error}`)
      }

      return NextResponse.json({
        success: true,
        message: 'Image generation completed',
        outputUrl,
        images: mockImages,
        licensing: licensingInfo
      })
    } catch (error) {
      await updateStepStatus(jobId, 'images', 'FAILED', `Image generation failed: ${error}`)
      await addJobLog(jobId, 'error', `Image generation failed: ${error}`)
      
      return NextResponse.json(
        { error: 'Image generation failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Images job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}