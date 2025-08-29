# Improve-PDF

A comprehensive PDF improvement application built with Next.js that transforms PDFs into professionally illustrated ebooks using AI enhancement while preserving original content meaning.

## 🎯 Features

- **PDF Text Extraction**: Advanced text extraction with OCR fallback for scanned documents
- **AI Content Enhancement**: Intelligent content improvement while preserving ≥98% of original length and meaning
- **Smart Illustration**: Automatic image generation (1 per 800-1200 words) with proper licensing
- **Multi-Format Output**: Generate HTML, PDF, and EPUB formats
- **Real-time Processing**: Track progress through 5-step pipeline with detailed logging
- **Content Preservation**: Embeddings-based validation ensures meaning retention
- **License Compliance**: Full attribution tracking for all generated images

## 🚀 Quick Start

### Prerequisites

- Node.js 18.18.0 or higher
- Vercel account (for deployment and Blob storage)
- OpenAI API key (for AI enhancement and image generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/FredWav/Improve-PDF.git
   cd Improve-PDF
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   **📋 IMPORTANT**: Configure your API keys in the `.env` file.
   
   **For detailed configuration instructions, see: [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md)**
   
   Required variables:
   ```env
   NEXT_PUBLIC_APP_NAME=Ebook Improver
   OPENAI_API_KEY=your_openai_api_key
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   PEXELS_API_KEY=your_pexels_key (optional)
   UNSPLASH_ACCESS_KEY=your_unsplash_key (optional)
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Processing Pipeline

The application follows a 5-step processing pipeline:

1. **Extract** (`/api/jobs/extract`)
   - PDF text extraction using pdfjs-dist
   - OCR fallback with tesseract.js for scanned documents
   - Batch processing (20-40 pages max per timeout)

2. **Normalize** (`/api/jobs/normalize`)
   - French typography rules (« », —, insecable spaces)
   - Formatting standardization
   - Text cleanup and structure preservation

3. **Rewrite** (`/api/jobs/rewrite`)
   - AI-powered content enhancement via OpenAI
   - Strict length preservation (≥98% original length)
   - Embeddings validation for meaning retention
   - Comprehensive audit trail

4. **Images** (`/api/jobs/images`)
   - Concept extraction and image generation
   - Fallback chain: OpenAI Images → Pexels → Unsplash
   - License tracking and attribution
   - Strategic placement (1 image per 800-1200 words)

5. **Render** (`/api/jobs/render`)
   - HTML generation via unified/remark/rehype
   - PDF export using Chromium headless (puppeteer-core)
   - EPUB creation with epub-gen
   - Comprehensive audit report

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Runtime**: Node.js (serverless compatible)
- **Storage**: Vercel Blob
- **AI Services**: OpenAI (GPT + DALL-E + Embeddings)
- **Image APIs**: Pexels, Unsplash (fallbacks)
- **PDF Processing**: pdfjs-dist, pdf-lib, tesseract.js
- **Content Pipeline**: unified, remark, rehype
- **Export**: puppeteer-core, @sparticuz/chromium, epub-gen
- **Utilities**: zod, diff, typopo

## 📁 Project Structure

```
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home page
│   ├── layout.tsx               # Root layout
│   ├── upload/page.tsx          # PDF upload interface
│   ├── ebook/[id]/page.tsx      # Status tracking page
│   └── api/                     # API routes
│       ├── upload/route.ts      # File upload handler
│       ├── enqueue/route.ts     # Job queue management
│       ├── status/[id]/route.ts # Status retrieval
│       ├── download/[jobId]/[type]/route.ts # File downloads
│       └── jobs/                # Processing pipeline
│           ├── extract/route.ts
│           ├── normalize/route.ts
│           ├── rewrite/route.ts
│           ├── images/route.ts
│           └── render/route.ts
├── components/                   # Reusable React components
│   ├── UploadArea.tsx
│   ├── ProgressSteps.tsx
│   └── DownloadCard.tsx
├── lib/                         # Core utilities
│   ├── blob.ts                  # Vercel Blob operations
│   ├── status.ts                # Job status management
│   ├── pdf.ts                   # PDF processing (TODO)
│   ├── ocr.ts                   # OCR functionality (TODO)
│   ├── llm.ts                   # OpenAI integration (TODO)
│   ├── images.ts                # Image generation (TODO)
│   └── html.ts                  # HTML/Export tools (TODO)
└── styles/
    └── globals.css              # Application styles
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_NAME` | No | Application display name |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob storage token |
| `PEXELS_API_KEY` | No | Pexels API for image fallback |
| `UNSPLASH_ACCESS_KEY` | No | Unsplash API for image fallback |
| `MAX_PDF_PAGES` | No | Maximum pages per processing batch (default: 500) |
| `EMBEDDING_SIMILARITY_THRESHOLD` | No | Similarity threshold for content validation (default: 0.93) |

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npx vercel
   ```

2. **Set environment variables** in Vercel dashboard

3. **Configure Vercel Blob** in project settings

4. **Deploy**
   ```bash
   npm run build
   npx vercel --prod
   ```

## 📊 Usage Limits & Costs

### Processing Limits
- **File Size**: 50MB maximum
- **Page Count**: 500 pages maximum (configurable)
- **Batch Size**: 20-40 pages per processing batch
- **Timeout**: 60 seconds per API route (Vercel limit)

### Cost Estimation
- **OpenAI API**: ~$0.002-0.02 per page (varies by content)
- **Vercel Blob**: $0.15/GB storage, $1/GB bandwidth
- **Images**: OpenAI DALL-E ~$0.02 per image

## 🔍 Quality Assurance

### Content Preservation
- **Length Retention**: ≥98% of original character count
- **Meaning Validation**: Embeddings similarity score ≥0.93
- **Structure Preservation**: Maintains headings, lists, formatting
- **Audit Trail**: Complete diff report with all changes

### Image Licensing
- **Attribution Tracking**: Full metadata for all images
- **License Compliance**: Automatic attribution generation
- **Source Documentation**: Detailed licensing reports
- **Fallback Chain**: Multiple sources ensure availability

## 🛠️ Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
```

### Testing

```bash
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:ci      # CI mode
```

### Code Quality

- **ESLint**: Configured with Next.js recommended rules
- **Prettier**: Automatic code formatting
- **TypeScript**: Strict mode enabled
- **Husky**: Pre-commit hooks for quality checks

## 📋 Implementation Status

### ✅ Completed
- Core Next.js application structure
- Complete API route system
- File upload and blob storage
- Job status tracking and logging
- Mock processing pipeline
- Real-time progress monitoring
- Download system

### 🚧 In Progress (Mock Implementations)
- PDF text extraction (pdfjs-dist integration)
- OCR processing (tesseract.js)
- OpenAI content enhancement
- Image generation pipeline
- HTML/PDF/EPUB rendering

### 📝 TODO
- Production AI integration
- Advanced PDF parsing
- Chromium serverless optimization
- Performance monitoring
- Error recovery mechanisms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Conventions
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation updates
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/updates
- `chore:` Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js**: React framework
- **Vercel**: Hosting and blob storage
- **OpenAI**: AI content enhancement
- **Pexels & Unsplash**: Image sources
- **Mozilla PDF.js**: PDF parsing
- **Tesseract.js**: OCR capabilities

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check the documentation
- Review environment variable setup

---

**Note**: This application processes content using AI while maintaining strict preservation constraints. All generated images include proper attribution and licensing information as required by their respective platforms.
