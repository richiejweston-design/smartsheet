/**
 * TransactionTable Component
 * Displays transactions with inline editing capability
 * Implements PROMPT 3: TRANSACTION EXTRACTION
 * Implements PROMPT 6: INLINE EDIT HANDLER
 * 
 * CRITICAL: Displays FULL descriptions exactly as shown in PDF
 * Never truncates or modifies descriptions unless user edits them
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Transaction, ValidationFlag } from '@/lib/types'
import { Edit2, Check, X, AlertCircle } from 'lucide-react'

interface TransactionTableProps {
  transactions: Transaction[]
  onEditTransaction: (rowId: string, field: string, newValue: string | null) => void
  validationFlags: ValidationFlag[]
}

export default function TransactionTable({
  transactions,
  onEditTransaction,
  validationFlags,
}: TransactionTableProps) {
  // Track which row is being edited
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  /**
   * Start editing a field
   */
  const startEdit = (rowId: string, field: string, currentValue: string | null) => {
    setEditingRowId(rowId)
    setEditField(field)
    setEditValue(currentValue || '')
  }

  /**
   * Save edit
   */
  const saveEdit = (rowId: string, field: string) => {
    onEditTransaction(rowId, field, editValue || null)
    setEditingRowId(null)
    setEditField(null)
    setEditValue('')
  }

  /**
   * Cancel edit
   */
  const cancelEdit = () => {
    setEditingRowId(null)
    setEditField(null)
    setEditValue('')
  }

  /**
   * Get flags for a specific row
   */
  const getRowFlags = (rowId: string) => {
    return validationFlags.filter((f) => f.rowId === rowId)
  }

  return (
    <Card className="border-slate-200 p-6">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Transactions</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Row ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Description</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Debit</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Credit</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Balance</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const rowFlags = getRowFlags(tx.rowId)
              const hasErrors = rowFlags.some((f) => f.severity === 'error')

              return (
                <tr
                  key={tx.rowId}
                  className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                    hasErrors ? 'bg-red-50' : tx.isEdited ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Row ID */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-600">
                        {tx.rowId}
                      </span>
                      {tx.isEdited && <Badge variant="secondary">Edited</Badge>}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3">
                    {editingRowId === tx.rowId && editField === 'postedDate' ? (
                      <Input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 w-32"
                      />
                    ) : (
                      <span className="text-slate-900">{tx.postedDate}</span>
                    )}
                  </td>

                  {/* Description - FULL, UNMODIFIED as shown in PDF */}
                  <td className="px-4 py-3 max-w-md">
                    {editingRowId === tx.rowId && editField === 'description' ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 w-full"
                        placeholder="Enter full description"
                      />
                    ) : (
                      <span className="text-slate-900 break-words whitespace-normal">
                        {tx.description}
                      </span>
                    )}
                  </td>

                  {/* Debit */}
                  <td className="px-4 py-3 text-right">
                    {editingRowId === tx.rowId && editField === 'debit' ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 w-24 text-right"
                      />
                    ) : (
                      <span className={tx.debit ? 'font-semibold text-red-600' : 'text-slate-400'}>
                        {tx.debit || '-'}
                      </span>
                    )}
                  </td>

                  {/* Credit */}
                  <td className="px-4 py-3 text-right">
                    {editingRowId === tx.rowId && editField === 'credit' ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 w-24 text-right"
                      />
                    ) : (
                      <span className={tx.credit ? 'font-semibold text-green-600' : 'text-slate-400'}>
                        {tx.credit || '-'}
                      </span>
                    )}
                  </td>

                  {/* Balance */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-900">
                      {tx.runningBalance || '-'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {editingRowId === tx.rowId ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveEdit(tx.rowId, editField!)}
                            className="h-8 w-8 p-0"
                            title="Save edit"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-8 w-8 p-0"
                            title="Cancel edit"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(tx.rowId, 'description', tx.description)}
                          className="h-8 w-8 p-0"
                          title="Edit description"
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Validation Flags */}
      {validationFlags.length > 0 && (
        <div className="mt-6 space-y-2 border-t border-slate-200 pt-6">
          <h3 className="font-semibold text-slate-900">Validation Issues</h3>
          {validationFlags.map((flag, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-lg p-3 ${
                flag.severity === 'error'
                  ? 'border border-red-200 bg-red-50'
                  : 'border border-yellow-200 bg-yellow-50'
              }`}
            >
              <AlertCircle
                className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                  flag.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                }`}
              />
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    flag.severity === 'error' ? 'text-red-900' : 'text-yellow-900'
                  }`}
                >
                  {flag.rowId && <span className="font-mono">[{flag.rowId}]</span>} {flag.message}
                </p>
                {flag.suggestedFix && (
                  <p className="mt-1 text-xs text-slate-600">Suggested: {flag.suggestedFix}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info about descriptions */}
      <div className="mt-6 border-t border-slate-200 pt-6">
        <p className="text-xs text-slate-600">
          <strong>Note:</strong> Descriptions are displayed exactly as they appear in the PDF. 
          Click the edit icon to modify any description if needed. Original values are preserved for audit purposes.
        </p>
      </div>
    </Card>
  )
}
