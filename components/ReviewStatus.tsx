/**
 * ReviewStatus Component
 * Displays current review status and export readiness
 * Implements PROMPT 7: REVIEW STATUS
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ValidationResult } from '@/lib/types'
import { CheckCircle, AlertCircle, FileText } from 'lucide-react'

interface ReviewStatusProps {
  totalTransactions: number
  validationResult: ValidationResult
}

export default function ReviewStatus({
  totalTransactions,
  validationResult,
}: ReviewStatusProps) {
  const errorCount = validationResult.flags.filter((f) => f.severity === 'error').length
  const warningCount = validationResult.flags.filter((f) => f.severity === 'warning').length
  const exportReady = validationResult.status === 'PASS'

  return (
    <Card className="border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Review Status</h2>
          <p className="mt-1 text-sm text-slate-600">Current validation and export readiness</p>
        </div>
        <div>
          {exportReady ? (
            <Badge className="bg-green-100 text-green-800">READY FOR EXPORT</Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">BLOCKED</Badge>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {/* Total Transactions */}
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium text-slate-600">Total Transactions</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalTransactions}</p>
        </div>

        {/* Flagged Rows */}
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm font-medium text-slate-600">Flagged Rows</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{validationResult.flaggedRowsCount}</p>
        </div>

        {/* Errors */}
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-700">Critical Errors</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-900">{errorCount}</p>
        </div>

        {/* Warnings */}
        <div className="rounded-lg bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-700">Warnings</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-900">{warningCount}</p>
        </div>
      </div>

      {/* Status Message */}
      <div className="mt-6 border-t border-slate-200 pt-6">
        {exportReady ? (
          <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">All validations passed!</p>
              <p className="mt-1 text-sm text-green-800">
                Your statement is ready for export. You can now download as CSV or OFX format.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Export blocked</p>
              <p className="mt-1 text-sm text-red-800">
                {errorCount} critical issue{errorCount !== 1 ? 's' : ''} must be resolved before
                exporting. Review the transaction table above and make corrections.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
