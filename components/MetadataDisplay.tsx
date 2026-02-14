/**
 * MetadataDisplay Component
 * Displays extracted statement metadata
 * Implements PROMPT 2: METADATA EXTRACTION
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatementMetadata } from '@/lib/types'
import { Calendar, DollarSign, Building2, CreditCard } from 'lucide-react'

interface MetadataDisplayProps {
  metadata: StatementMetadata
}

export default function MetadataDisplay({ metadata }: MetadataDisplayProps) {
  return (
    <Card className="border-slate-200 p-6">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Statement Metadata</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Institution Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="mt-1 h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-600">Financial Institution</p>
              <p className="text-lg font-semibold text-slate-900">{metadata.financialInstitution}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CreditCard className="mt-1 h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-600">Account Name</p>
              <p className="text-lg font-semibold text-slate-900">{metadata.accountName}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-600">Account Number (Last 4)</p>
            <p className="text-lg font-semibold text-slate-900">****{metadata.accountNumberLastFour}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-600">Account Type</p>
            <Badge variant="outline">{metadata.accountType}</Badge>
          </div>
        </div>

        {/* Period & Balance Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="mt-1 h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-600">Statement Period</p>
              <p className="text-lg font-semibold text-slate-900">
                {metadata.statementStartDate} to {metadata.statementEndDate}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="mt-1 h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-600">Opening Balance</p>
              <p className="text-lg font-semibold text-slate-900">
                {metadata.currency} {parseFloat(metadata.openingBalance || '0').toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="mt-1 h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-slate-600">Closing Balance</p>
              <p className="text-lg font-semibold text-slate-900">
                {metadata.currency} {parseFloat(metadata.closingBalance || '0').toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 border-t border-slate-200 pt-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Transaction Summary</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Total Debits</p>
            <p className="text-xl font-semibold text-slate-900">
              {metadata.currency} {parseFloat(metadata.totalDebits || '0').toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Total Credits</p>
            <p className="text-xl font-semibold text-slate-900">
              {metadata.currency} {parseFloat(metadata.totalCredits || '0').toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-slate-600">Currency</p>
            <p className="text-xl font-semibold text-blue-900">{metadata.currency}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
