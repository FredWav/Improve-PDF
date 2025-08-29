import { NextRequest, NextResponse } from 'next/server';
import { loadJobStatus } from '../../../../../lib/status';
import { getFile } from '../../../../../lib/blob';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string; type: string } }
) {
  const jobId = params.jobId;
  const type = params.type;
  
  try {
    const status = await loadJobStatus(jobId);
    if (!status) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    let outputUrl: string | undefined;
    
    switch (type) {
      case 'raw-text':
        outputUrl = status.rawTextUrl;
        break;
      case 'normalized-text':
        outputUrl = status.normalizedTextUrl;
        break;
      case 'rewritten-text':
        outputUrl = status.rewrittenTextUrl;
        break;
      case 'rendered-html':
        outputUrl = status.renderedHtmlUrl;
        break;
      case 'rendered-markdown':
        outputUrl = status.renderedMarkdownUrl;
        break;
      case 'pdf-output':
        outputUrl = status.pdfOutputUrl;
        break;
      default:
        return NextResponse.json({ error: 'Invalid download type' }, { status: 400 });
    }
    
    if (!outputUrl) {
      return NextResponse.json({ error: `${type} not available for this job` }, { status: 404 });
    }
    
    try {
      const response = await getFile(outputUrl);
      // response est maintenant garanti non-null car getFile lance une erreur en cas d'échec
      
      const blob = await response.blob();
      
      // Déterminer le type MIME et le nom de fichier
      let contentType = response.headers.get('content-type') || 'application/octet-stream';
      let filename = `${jobId}-${type}`;
      
      if (type === 'raw-text' || type === 'normalized-text' || type === 'rewritten-text') {
        contentType = 'text/plain';
        filename += '.txt';
      } else if (type === 'rendered-html') {
        contentType = 'text/html';
        filename += '.html';
      } else if (type === 'rendered-markdown') {
        contentType = 'text/markdown';
        filename += '.md';
      } else if (type === 'pdf-output') {
        contentType = 'application/pdf';
        filename += '.pdf';
      }
      
      // Créer une réponse avec le bon type MIME et l'en-tête de téléchargement
      return new NextResponse(blob, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      console.error('Error fetching file:', error);
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in download route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
