/**
 * ExportPanel Component
 * Handles CSV and OFX export functionality
 * Implements PROMPT 8: CSV EXPORT
 * Implements PROMPT 9: OFX EXPORT
 */

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, FileText, AlertCircle } from 'lucide-react'

interface ExportPanelProps {
  isReady: boolean
  blockedReason: string | null
  onExportCSV: () => void
  onExportOFX: () => void
}

export default function ExportPanel({
  isReady,
  blockedReason,
  onExportCSV,
  onExportOFX,
}: ExportPanelProps) {
  return (
    <Card className="border-slate-200 p-6">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Export Statement</h2>

      {!isReady && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Export Blocked:</strong> {blockedReason}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* CSV Export */}
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">CSV Export</h3>
              <p className="text-sm text-slate-600">Comma-separated values</p>
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-600">
            Export your statement as a CSV file with columns: date, description, amount, balance.
            Perfect for spreadsheets and accounting software.
          </p>

          <Button
            onClick={onExportCSV}
            disabled={!isReady}
            className="w-full"
            variant={isReady ? 'default' : 'secondary'}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>

          <p className="mt-3 text-xs text-slate-500">
            Format: YYYY-MM-DD, normalized amounts, two decimals
          </p>
        </div>

        {/* OFX Export */}
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">OFX Export</h3>
              <p className="text-sm text-slate-600">Open Financial Exchange</p>
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-600">
            Export your statement in OFX format for direct import into accounting software like
            QuickBooks, Xero, or Wave.
          </p>

          <Button
            onClick={onExportOFX}
            disabled={!isReady}
            className="w-full"
            variant={isReady ? 'default' : 'secondary'}
          >
            <Download className="mr-2 h-4 w-4" />
            Download OFX
          </Button>

          <p className="mt-3 text-xs text-slate-500">
            Format: OFX 2.x, stable FITID, complete statement
          </p>
        </div>
      </div>

      {/* Export Information */}
      <div className="mt-6 border-t border-slate-200 pt-6">
        <h3 className="mb-4 font-semibold text-slate-900">Export Information</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
            <span>
              <strong>CSV Format:</strong> Standard comma-separated values with headers. Compatible
              with Excel, Google Sheets, and most accounting software.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-600" />
            <span>
              <strong>OFX Format:</strong> Open Financial Exchange standard. Direct import support
              in QuickBooks, Xero, Wave, and other accounting platforms.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-600" />
            <span>
              <strong>Data Integrity:</strong> All exports use normalized, validated data. Duplicate
              detection hashes are generated for import tracking.
            </span>
          </li>
        </ul>
      </div>
    </Card>
  )
}
