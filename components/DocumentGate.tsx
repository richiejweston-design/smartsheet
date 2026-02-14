/**
 * DocumentGate Component
 * Handles PDF file upload and initial validation
 * Implements PROMPT 1: DOCUMENT GATE
 * 
 * In demo mode, clicking the button loads sample data directly
 * In production, would handle actual PDF file uploads
 */

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle } from 'lucide-react'

interface DocumentGateProps {
  onFileUpload: (file: File | null) => Promise<void>
  isLoading: boolean
}

export default function DocumentGate({ onFileUpload, isLoading }: DocumentGateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  /**
   * Handle file selection from input
   * In demo mode, file will be null and we load sample data
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      await onFileUpload(files[0])
    } else {
      // Demo mode - load sample data
      await onFileUpload(null)
    }
  }

  /**
   * Handle drag and drop
   */
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  /**
   * Handle drop
   */
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      await onFileUpload(files[0])
    }
  }

  /**
   * Handle demo button click - load sample data
   */
  const handleDemoClick = async () => {
    await onFileUpload(null)
  }

  return (
    <div className="space-y-6">
      {/* Requirements Card */}
      <Card className="border-slate-200 bg-blue-50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Document Requirements</h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            One account per PDF
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Bank or credit card statement
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Single currency
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Monthly period with clear dates
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Opening and closing balances
          </li>
        </ul>
      </Card>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-blue-100 p-4">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">Upload Bank Statement</h3>
            <p className="mt-1 text-sm text-slate-600">
              Drag and drop your PDF here, or click to select
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            size="lg"
            className="mt-4"
          >
            {isLoading ? 'Processing...' : 'Select PDF File'}
          </Button>

          <p className="text-xs text-slate-500">PDF files only • Max 50MB</p>
        </div>
      </div>

      {/* Demo Notice with Demo Button */}
      <Alert className="border-blue-200 bg-blue-50">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between text-blue-800">
          <span>
            <strong>Demo Mode:</strong> Click &quot;Load Sample Statement&quot; to load a sample statement with 7 transactions.
            In production, this would parse your actual PDF file.
          </span>
          <Button
            onClick={handleDemoClick}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="ml-4 border-blue-600 text-blue-600 hover:bg-blue-100"
          >
            {isLoading ? 'Loading...' : 'Load Sample Statement'}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
