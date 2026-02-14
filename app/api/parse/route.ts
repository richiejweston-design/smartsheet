/**
 * API Route: POST /api/parse
 * Handles PDF file uploads and parsing
 * 
 * Request:
 * - multipart/form-data with 'file' field containing PDF
 * 
 * Response:
 * - JSON with parsed metadata and transactions
 * - Validation results
 * - Document gate status
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  extractPDFText,
  parseStatementText,
  normalizeTransactions,
  reconcileStatement,
  validateDocument,
} from '@/lib/parser'

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract text from PDF
    const pdfText = await extractPDFText(buffer)

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. Please ensure the PDF contains readable text.' },
        { status: 400 }
      )
    }

    // Parse statement text
    const { metadata, transactions } = parseStatementText(pdfText)

    // Validate document (Document Gate - Prompt 1)
    const documentValidation = validateDocument(metadata)

    // Normalize transactions (Prompt 4)
    const { normalized: normalizedTransactions, errors: normalizationErrors } =
      normalizeTransactions(transactions)

    // Reconcile statement (Prompt 5)
    const reconciliationResult = reconcileStatement(metadata, normalizedTransactions)

    // Combine all validation flags
    const allFlags = [
      ...normalizationErrors,
      ...reconciliationResult.flags,
    ]

    return NextResponse.json({
      success: true,
      metadata,
      transactions: normalizedTransactions,
      validation: {
        documentGate: documentValidation,
        reconciliation: reconciliationResult,
        allFlags,
      },
      summary: {
        totalTransactions: transactions.length,
        extractedText: pdfText.substring(0, 500), // First 500 chars for debugging
      },
    })
  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to parse PDF',
      },
      { status: 500 }
    )
  }
}
