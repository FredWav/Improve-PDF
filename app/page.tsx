import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Transform Your PDFs into Professional Ebooks
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Upload a PDF and watch as AI enhances the writing, adds illustrations, 
          and produces professional HTML, PDF, and EPUB formats with full licensing attribution.
        </p>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">How it works:</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">1</div>
              <h3 className="font-medium mb-1">Extract</h3>
              <p className="text-gray-600">Parse PDF text with OCR fallback</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">2</div>
              <h3 className="font-medium mb-1">Normalize</h3>
              <p className="text-gray-600">Fix typography and formatting</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">3</div>
              <h3 className="font-medium mb-1">Improve</h3>
              <p className="text-gray-600">AI enhances writing while preserving meaning</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">4</div>
              <h3 className="font-medium mb-1">Illustrate</h3>
              <p className="text-gray-600">Add relevant images with proper licensing</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">5</div>
              <h3 className="font-medium mb-1">Export</h3>
              <p className="text-gray-600">Generate HTML, PDF, and EPUB formats</p>
            </div>
          </div>
        </div>

        <Link 
          href="/upload" 
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Get Started - Upload PDF
        </Link>

        <div className="mt-8 text-sm text-gray-500">
          <p>⚠️ Content preservation: AI maintains ≥98% original length and meaning</p>
          <p>📝 Full audit reports provided with licensing attribution</p>
        </div>
      </div>
    </div>
  )
}