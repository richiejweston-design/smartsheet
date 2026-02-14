/**
 * Core types for the bookkeeping statement parser
 * Defines all data structures used throughout the application
 */

// Transaction row with all extracted data
export interface Transaction {
  rowId: string
  postedDate: string | null
  description: string
  debit: string | null
  credit: string | null
  runningBalance: string | null
  // Normalized values after processing
  normalizedDate?: string | null
  normalizedAmount?: number | null
  normalizedBalance?: number | null
  // Original values before editing
  originalPostedDate?: string | null
  originalDescription?: string
  originalDebit?: string | null
  originalCredit?: string | null
  // Edit tracking
  isEdited?: boolean
  editedFields?: string[]
}

// Statement metadata extracted from PDF
export interface StatementMetadata {
  financialInstitution: string | null
  accountName: string | null
  accountNumberLastFour: string | null
  accountType: string | null
  currency: string | null
  statementStartDate: string | null
  statementEndDate: string | null
  openingBalance: string | null
  closingBalance: string | null
  totalDebits: string | null
  totalCredits: string | null
  // Normalized values
  normalizedOpeningBalance?: number
  normalizedClosingBalance?: number
  normalizedTotalDebits?: number
  normalizedTotalCredits?: number
}

// Validation flag for issues found during processing
export interface ValidationFlag {
  rowId: string | null
  severity: 'error' | 'warning'
  message: string
  field?: string
  suggestedFix?: string
}

// Overall statement validation result
export interface ValidationResult {
  status: 'PASS' | 'BLOCK'
  flags: ValidationFlag[]
  isReconciled: boolean
  totalTransactions: number
  flaggedRowsCount: number
}

// User edit request
export interface EditRequest {
  rowId: string
  field: 'postedDate' | 'description' | 'debit' | 'credit'
  newValue: string | null
}

// Export status and readiness
export interface ExportStatus {
  isReady: boolean
  blockedReason: string | null
  totalTransactions: number
  flaggedCount: number
  unresolvedFlags: ValidationFlag[]
}

// CSV export row
export interface CSVRow {
  date: string
  description: string
  amount: number
  balance: number
}

// Transaction hash for duplicate detection
export interface TransactionHash {
  rowId: string
  hash: string
  date: string
  amount: number
  description: string
  accountLastFour: string
}

// Application state
export interface ParserState {
  metadata: StatementMetadata | null
  transactions: Transaction[]
  validationResult: ValidationResult | null
  exportStatus: ExportStatus | null
  transactionHashes: TransactionHash[]
  isLoading: boolean
  error: string | null
}
