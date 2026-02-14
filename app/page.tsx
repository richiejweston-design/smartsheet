/**
 * SmartSheet - Main Application
 * 
 * Implements all 10 prompts from specification:
 * 1. Document Gate - Validates PDF requirements
 * 2. Metadata Extraction - Extracts statement metadata
 * 3. Transaction Extraction - Extracts all transactions with FULL descriptions
 * 4. Normalization - Normalizes data for processing
 * 5. Reconciliation - Validates statement integrity
 * 6. Inline Editing - Allows user edits with re-validation
 * 7. Review Status - Shows current validation status
 * 8. CSV Export - Exports to CSV (conditional on READY status)
 * 9. OFX Export - Exports to OFX (conditional on READY status)
 * 10. Duplicate Protection - Generates stable transaction hashes
 * 
 * CRITICAL RULES:
 * - Never invent data
 * - Never merge transactions
 * - Never rewrite descriptions unless edited by user
 * - Preserve original order
 * - Use null for missing values
 * - Re-run validation after every edit
 * - Block export until all flags are cleared
 */

'use client'

import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import DocumentGate from '@/components/DocumentGate'
import MetadataDisplay from '@/components/MetadataDisplay'
import TransactionTable from '@/components/TransactionTable'
import ReviewStatus from '@/components/ReviewStatus'
import ExportPanel from '@/components/ExportPanel'
import {
  normalizeTransactions,
  reconcileStatement,
  applyEdit,
  generateReviewStatus,
  generateCSVExport,
  generateOFXExport,
} from '@/lib/parser'
import { Transaction, StatementMetadata, ValidationResult } from '@/lib/types'

export default function Home() {
  // State management
  const [isDocumentValid, setIsDocumentValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [metadata, setMetadata] = useState<StatementMetadata | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle document upload and validation
   * PROMPT 1: DOCUMENT GATE
   * Sends PDF to API for real parsing using unpdf library
   */
  const handleFileUpload = useCallback(async (file: File | null) => {
    // If user cleared the file input, treat as no-op
    if (!file) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // Create FormData for multipart upload
      const formData = new FormData()
      formData.append('file', file)

      // Send to API for parsing
      const response = await fetch('/api/parse', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse PDF')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse PDF')
      }

      // Extract parsed data from response
      const parsedMetadata = result.metadata
      const parsedTransactions = result.transactions

      // Check if we got any transactions
      if (!parsedTransactions || parsedTransactions.length === 0) {
        setError('No transactions found in PDF. Please ensure the PDF contains a valid bank statement.')
        setIsLoading(false)
        return
      }

      setMetadata(parsedMetadata)
      setTransactions(parsedTransactions)
      setIsDocumentValid(true)

      // PROMPT 4: NORMALIZATION & PROMPT 5: RECONCILIATION
      const { normalized } = normalizeTransactions(parsedTransactions)
      const reconciliation = reconcileStatement(parsedMetadata, normalized)
      setValidationResult(reconciliation)

      // Log validation results for debugging
      console.log('Document validation:', result.validation.documentGate)
      console.log('Reconciliation result:', reconciliation)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Parse error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Handle inline transaction edit
   * PROMPT 6: INLINE EDIT HANDLER
   * Re-runs normalization and reconciliation after edit
   */
  const handleEditTransaction = useCallback(
    (rowId: string, field: string, newValue: string | null) => {
      const updatedTransactions = transactions.map((tx) => {
        if (tx.rowId === rowId) {
          return applyEdit(tx, field, newValue)
        }
        return tx
      })

      setTransactions(updatedTransactions)

      // Re-run normalization and reconciliation
      const { normalized } = normalizeTransactions(updatedTransactions)
      const reconciliation = reconcileStatement(metadata!, normalized)
      setValidationResult(reconciliation)
    },
    [transactions, metadata]
  )

  /**
   * Handle CSV export
   * PROMPT 8: CSV EXPORT
   */
  const handleExportCSV = useCallback(() => {
    if (!validationResult || validationResult.status !== 'PASS') {
      alert('Cannot export: Statement has unresolved validation issues')
      return
    }

    const { normalized } = normalizeTransactions(transactions)
    const csv = generateCSVExport(normalized, true)

    if (!csv) {
      alert('Failed to generate CSV')
      return
    }

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement-${metadata?.statementStartDate}-${metadata?.statementEndDate}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, [transactions, metadata, validationResult])

  /**
   * Handle OFX export
   * PROMPT 9: OFX EXPORT
   */
  const handleExportOFX = useCallback(() => {
    if (!validationResult || validationResult.status !== 'PASS') {
      alert('Cannot export: Statement has unresolved validation issues')
      return
    }

    const { normalized } = normalizeTransactions(transactions)
    const ofx = generateOFXExport(metadata!, normalized, true)

    if (!ofx) {
      alert('Failed to generate OFX')
      return
    }

    // Download OFX
    const blob = new Blob([ofx], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement-${metadata?.statementStartDate}-${metadata?.statementEndDate}.ofx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, [transactions, metadata, validationResult])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">SmartSheet</h1>
          <p className="text-lg text-slate-600">
            Professional bank statement validation, editing, and export
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error Parsing PDF</h3>
                <p className="text-sm text-red-800 mt-1">{error}</p>
                <p className="text-xs text-red-700 mt-2">
                  Please ensure your PDF is a valid bank statement with readable text. Try uploading a different file.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Document Gate */}
        {!isDocumentValid ? (
          <DocumentGate onFileUpload={handleFileUpload} isLoading={isLoading} />
        ) : (
          <>
            {/* Success Message */}
            <Card className="border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">PDF Parsed Successfully</h3>
                  <p className="text-sm text-green-800">
                    {transactions.length} transactions extracted and validated
                  </p>
                </div>
              </div>
            </Card>

            {/* Metadata Display */}
            {metadata && <MetadataDisplay metadata={metadata} />}

            {/* Transaction Table */}
            {transactions.length > 0 && (
              <TransactionTable
                transactions={transactions}
                onEditTransaction={handleEditTransaction}
                validationFlags={validationResult?.flags || []}
              />
            )}

            {/* Review Status */}
            {validationResult && (
              <ReviewStatus
                totalTransactions={transactions.length}
                validationResult={validationResult}
              />
            )}

            {/* Export Panel */}
            {validationResult && (
              <ExportPanel
                isReady={validationResult.status === 'PASS'}
                blockedReason={validationResult.status === 'BLOCK' ? 'Unresolved validation issues' : null}
                onExportCSV={handleExportCSV}
                onExportOFX={handleExportOFX}
              />
            )}

            {/* Reset Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDocumentValid(false)
                  setMetadata(null)
                  setTransactions([])
                  setValidationResult(null)
                  setError(null)
                }}
              >
                Load Different Statement
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
