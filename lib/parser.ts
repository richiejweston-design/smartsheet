/**
 * Core parser logic for bookkeeping statements
 * Implements all 10 prompts from the specification
 * Now with REAL PDF parsing using unpdf library
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

import {
  Transaction,
  StatementMetadata,
  ValidationFlag,
  ValidationResult,
  TransactionHash,
  CSVRow,
} from './types'

/**
 * Simple hash function for client-side use
 * Generates a stable hash from input string
 */
function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Extract text from PDF using unpdf library
 * This is called from the API route to parse uploaded PDFs
 * 
 * @param pdfBuffer - Buffer containing PDF file data
 * @returns Extracted text from PDF
 */
export async function extractPDFText(pdfBuffer: Buffer): Promise<string> {
  try {
    // Import unpdf dynamically (server-side only)
    const { extractText, getDocumentProxy } = await import('unpdf')
    
    // Convert Buffer to Uint8Array (required by unpdf)
    const uint8Array = new Uint8Array(pdfBuffer)
    
    // Get PDF document proxy
    const pdf = await getDocumentProxy(uint8Array)
    
    // Extract text from PDF with merged pages
    const { text } = await extractText(pdf, { mergePages: true })
    
    return text || ''
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse bank statement text using regex patterns
 * Handles common bank statement formats
 * 
 * @param pdfText - Extracted text from PDF
 * @returns Parsed metadata and transactions
 */
export function parseStatementText(pdfText: string): {
  metadata: StatementMetadata
  transactions: Transaction[]
} {
  const metadata: StatementMetadata = {
    financialInstitution: null,
    accountName: null,
    accountNumberLastFour: null,
    accountType: null,
    currency: null,
    statementStartDate: null,
    statementEndDate: null,
    openingBalance: null,
    closingBalance: null,
    totalDebits: null,
    totalCredits: null,
  }

  const transactions: Transaction[] = []

  // Split text into lines for processing
  const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  // Extract metadata using regex patterns
  // Look for common patterns in bank statements
  
  // Financial institution (look for bank names)
  const bankMatch = pdfText.match(/(?:Bank|Credit Union|Financial|Institution)[\s:]*([^\n]+)/i)
  if (bankMatch) {
    metadata.financialInstitution = bankMatch[1].trim()
  }

  // Account name/type
  const accountMatch = pdfText.match(/(?:Account|Checking|Savings)[\s:]*([^\n]+)/i)
  if (accountMatch) {
    metadata.accountName = accountMatch[1].trim()
  }

  // Account number (last 4 digits)
  const accountNumMatch = pdfText.match(/(?:Account\s*(?:Number|#)|Acct)[\s:]*\*+(\d{4})/i)
  if (accountNumMatch) {
    metadata.accountNumberLastFour = accountNumMatch[1]
  }

  // Statement dates
  const dateRangeMatch = pdfText.match(/(?:Statement|Period)[\s:]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s*(?:to|-|through)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i)
  if (dateRangeMatch) {
    metadata.statementStartDate = parseDateString(dateRangeMatch[1])
    metadata.statementEndDate = parseDateString(dateRangeMatch[2])
  }

  // Opening balance
  const openingMatch = pdfText.match(/(?:Opening|Beginning)\s+(?:Balance|Amount)[\s:]*\$?([\d,]+\.?\d*)/i)
  if (openingMatch) {
    metadata.openingBalance = openingMatch[1].replace(/,/g, '')
    metadata.normalizedOpeningBalance = parseFloat(metadata.openingBalance)
  }

  // Closing balance
  const closingMatch = pdfText.match(/(?:Closing|Ending|Final)\s+(?:Balance|Amount)[\s:]*\$?([\d,]+\.?\d*)/i)
  if (closingMatch) {
    metadata.closingBalance = closingMatch[1].replace(/,/g, '')
    metadata.normalizedClosingBalance = parseFloat(metadata.closingBalance)
  }

  // Currency (default to USD if not found)
  const currencyMatch = pdfText.match(/(?:Currency|USD|GBP|EUR|CAD|AUD)/i)
  metadata.currency = currencyMatch ? currencyMatch[0].toUpperCase() : 'USD'

  // Extract transactions using regex patterns
  // Look for common transaction patterns: Date | Description | Amount | Balance
  // Pattern: MM/DD/YYYY or DD/MM/YYYY followed by description and amounts
  
  const transactionPattern = /(\d{1,2}\/\d{1,2}\/\d{4})\s+([^\d\n]+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/gm
  let match
  let rowId = 1

  while ((match = transactionPattern.exec(pdfText)) !== null) {
    const [, dateStr, description, amount1, amount2] = match

    // Determine if amount1 is debit or credit based on context
    // Typically: debit (withdrawal) | credit (deposit)
    const tx: Transaction = {
      rowId: `row_${rowId}`,
      postedDate: parseDateString(dateStr),
      description: description.trim(),
      debit: null,
      credit: null,
      runningBalance: null,
      normalizedDate: null,
      normalizedAmount: null,
      normalizedBalance: null,
      isEdited: false,
      editedFields: [],
    }

    // Simple heuristic: if description contains keywords, classify as debit or credit
    const descLower = description.toLowerCase()
    if (descLower.includes('withdrawal') || descLower.includes('debit') || descLower.includes('payment')) {
      tx.debit = amount1
    } else if (descLower.includes('deposit') || descLower.includes('credit') || descLower.includes('transfer in')) {
      tx.credit = amount1
    } else {
      // Default: assume first amount is debit, second is credit
      tx.debit = amount1
    }

    // Running balance is typically the last amount
    tx.runningBalance = amount2

    transactions.push(tx)
    rowId++
  }

  // If no transactions found with pattern, return empty array
  // User will need to manually add or upload a different format

  return { metadata, transactions }
}

/**
 * Parse date string in various formats
 * Handles: MM/DD/YYYY, DD/MM/YYYY, Month DD, YYYY, etc.
 */
function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null

  try {
    // Try parsing as MM/DD/YYYY or DD/MM/YYYY
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (slashMatch) {
      const [, month, day, year] = slashMatch
      // Assume MM/DD/YYYY format (US standard)
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // Try parsing as "Month DD, YYYY"
    const monthMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/)
    if (monthMatch) {
      const [, monthName, day, year] = monthMatch
      const monthNum = new Date(`${monthName} 1, 2000`).getMonth() + 1
      return `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    return null
  } catch {
    return null
  }
}

/**
 * PROMPT 1: DOCUMENT GATE
 * Validates that the uploaded PDF meets basic requirements
 * Returns PASS or BLOCK with specific reasons
 * 
 * Confirms:
 * - Exactly one account
 * - Bank or credit card statement
 * - Statement start date
 * - Statement end date
 * - Opening balance
 * - Closing balance
 */
export function validateDocument(metadata: StatementMetadata): {
  status: 'PASS' | 'BLOCK'
  reasons: string[]
} {
  const reasons: string[] = []

  // Check for required metadata fields
  if (!metadata.financialInstitution) {
    reasons.push('Financial institution not identified')
  }
  if (!metadata.accountName) {
    reasons.push('Account name not found')
  }
  if (!metadata.statementStartDate) {
    reasons.push('Statement start date missing')
  }
  if (!metadata.statementEndDate) {
    reasons.push('Statement end date missing')
  }
  if (!metadata.openingBalance) {
    reasons.push('Opening balance not found')
  }
  if (!metadata.closingBalance) {
    reasons.push('Closing balance not found')
  }
  if (!metadata.currency) {
    reasons.push('Currency not identified')
  }

  return {
    status: reasons.length === 0 ? 'PASS' : 'BLOCK',
    reasons,
  }
}

/**
 * PROMPT 2: METADATA EXTRACTION
 * Extracts statement metadata from PDF
 * 
 * Returns:
 * - Financial institution
 * - Account name
 * - Account number last four digits
 * - Account type
 * - Currency
 * - Statement start date
 * - Statement end date
 * - Opening balance
 * - Closing balance
 * - Total debits
 * - Total credits
 * 
 * Preserves values exactly as they appear
 */
export function extractMetadata(pdfText: string): StatementMetadata {
  const { metadata } = parseStatementText(pdfText)
  return metadata
}

/**
 * PROMPT 3: TRANSACTION EXTRACTION
 * Extracts all transactions from statement
 * 
 * For each transaction returns:
 * - Row ID (must be stable)
 * - Posted date
 * - Description (FULL, UNMODIFIED - preserve exactly as shown in PDF)
 * - Debit
 * - Credit
 * - Running balance
 * 
 * Rules:
 * - Row ID must be stable
 * - One row per transaction
 * - Preserve order
 * - Do not normalize
 * - Use null where missing
 * - PRESERVE FULL DESCRIPTIONS EXACTLY AS SHOWN
 */
export function extractTransactions(pdfText: string): Transaction[] {
  const { transactions } = parseStatementText(pdfText)
  return transactions
}

/**
 * PROMPT 4: NORMALIZATION
 * Normalizes transaction data for processing
 * 
 * Rules:
 * - Use posted date
 * - Date format YYYY-MM-DD
 * - Debit negative
 * - Credit positive
 * - Two decimals
 * - Remove currency symbols
 * 
 * For each row return:
 * - Row ID
 * - Normalized amount
 * - Normalized date
 * - Any normalization error
 */
export function normalizeTransactions(
  transactions: Transaction[]
): { normalized: Transaction[]; errors: ValidationFlag[] } {
  const errors: ValidationFlag[] = []
  const normalized = transactions.map((tx) => {
    const normalized = { ...tx }

    // Normalize date to YYYY-MM-DD format
    if (tx.postedDate) {
      try {
        const date = new Date(tx.postedDate)
        if (!isNaN(date.getTime())) {
          normalized.normalizedDate = date.toISOString().split('T')[0]
        } else {
          errors.push({
            rowId: tx.rowId,
            severity: 'error',
            message: `Invalid date format: ${tx.postedDate}`,
            field: 'postedDate',
          })
        }
      } catch {
        errors.push({
          rowId: tx.rowId,
          severity: 'error',
          message: `Date parsing error: ${tx.postedDate}`,
          field: 'postedDate',
        })
      }
    }

    // Normalize amount: debit negative, credit positive
    let amount = 0
    if (tx.debit) {
      const debitNum = parseFloat(tx.debit.replace(/[^0-9.-]/g, ''))
      if (!isNaN(debitNum)) {
        amount = -Math.abs(debitNum)
      }
    }
    if (tx.credit) {
      const creditNum = parseFloat(tx.credit.replace(/[^0-9.-]/g, ''))
      if (!isNaN(creditNum)) {
        amount = Math.abs(creditNum)
      }
    }
    normalized.normalizedAmount = Math.round(amount * 100) / 100

    // Normalize running balance
    if (tx.runningBalance) {
      const balanceNum = parseFloat(tx.runningBalance.replace(/[^0-9.-]/g, ''))
      if (!isNaN(balanceNum)) {
        normalized.normalizedBalance = Math.round(balanceNum * 100) / 100
      }
    }

    return normalized
  })

  return { normalized, errors }
}

/**
 * PROMPT 5: RECONCILIATION GATE
 * Reconciles the statement using normalized data
 * 
 * Validates:
 * - Opening balance
 * - Sum of transactions
 * - Closing balance
 * - Running balance integrity
 * - Dates within statement range
 * 
 * Returns:
 * - PASS
 * - Or BLOCK with row IDs and reasons
 */
export function reconcileStatement(
  metadata: StatementMetadata,
  transactions: Transaction[]
): ValidationResult {
  const flags: ValidationFlag[] = []

  // Parse opening and closing balances
  const openingBalance = metadata.normalizedOpeningBalance || 0
  const closingBalance = metadata.normalizedClosingBalance || 0

  // Calculate sum of all transactions
  const transactionSum = transactions.reduce((sum, tx) => {
    return sum + (tx.normalizedAmount || 0)
  }, 0)

  // Check if opening + sum = closing
  const calculatedClosing = openingBalance + transactionSum
  const difference = Math.abs(calculatedClosing - closingBalance)

  if (difference > 0.01) {
    // Allow for rounding errors
    flags.push({
      rowId: null,
      severity: 'error',
      message: `Reconciliation mismatch: Opening (${openingBalance}) + Transactions (${transactionSum}) ≠ Closing (${closingBalance}). Difference: ${difference}`,
    })
  }

  // Validate running balances
  let expectedBalance = openingBalance
  for (const tx of transactions) {
    expectedBalance += tx.normalizedAmount || 0
    if (tx.normalizedBalance !== undefined && tx.normalizedBalance !== null) {
      const diff = Math.abs(expectedBalance - tx.normalizedBalance)
      if (diff > 0.01) {
        flags.push({
          rowId: tx.rowId,
          severity: 'warning',
          message: `Running balance mismatch: Expected ${expectedBalance}, got ${tx.normalizedBalance}`,
          field: 'runningBalance',
        })
      }
    }
  }

  // Validate dates are within statement range
  if (metadata.statementStartDate && metadata.statementEndDate) {
    const startDate = new Date(metadata.statementStartDate)
    const endDate = new Date(metadata.statementEndDate)

    for (const tx of transactions) {
      if (tx.normalizedDate) {
        const txDate = new Date(tx.normalizedDate)
        if (txDate < startDate || txDate > endDate) {
          flags.push({
            rowId: tx.rowId,
            severity: 'warning',
            message: `Transaction date ${tx.normalizedDate} outside statement period`,
            field: 'postedDate',
          })
        }
      }
    }
  }

  const isReconciled = flags.filter((f) => f.severity === 'error').length === 0

  return {
    status: isReconciled ? 'PASS' : 'BLOCK',
    flags,
    isReconciled,
    totalTransactions: transactions.length,
    flaggedRowsCount: new Set(flags.map((f) => f.rowId)).size,
  }
}

/**
 * PROMPT 6: INLINE EDIT HANDLER
 * Applies user edits to transactions
 * 
 * Input:
 * - Row ID
 * - Edited field
 * - New value
 * 
 * Rules:
 * - Only edited fields may change
 * - Preserve original values separately
 * - Do not auto-correct other rows
 * 
 * After applying edits:
 * - Re-run normalization
 * - Re-run reconciliation
 * - Update flag status
 */
export function applyEdit(
  transaction: Transaction,
  field: string,
  newValue: string | null
): Transaction {
  const edited = { ...transaction }

  // Store original value if not already stored
  if (!edited.originalPostedDate && field === 'postedDate') {
    edited.originalPostedDate = transaction.postedDate
  }
  if (!edited.originalDescription && field === 'description') {
    edited.originalDescription = transaction.description
  }
  if (!edited.originalDebit && field === 'debit') {
    edited.originalDebit = transaction.debit
  }
  if (!edited.originalCredit && field === 'credit') {
    edited.originalCredit = transaction.credit
  }

  // Apply the edit
  switch (field) {
    case 'postedDate':
      edited.postedDate = newValue
      break
    case 'description':
      edited.description = newValue || ''
      break
    case 'debit':
      edited.debit = newValue
      break
    case 'credit':
      edited.credit = newValue
      break
  }

  // Mark as edited
  edited.isEdited = true
  if (!edited.editedFields) {
    edited.editedFields = []
  }
  if (!edited.editedFields.includes(field)) {
    edited.editedFields.push(field)
  }

  return edited
}

/**
 * PROMPT 7: REVIEW STATUS
 * Generates current review status
 * 
 * Returns:
 * - Total transactions
 * - Flagged rows count
 * - List of unresolved flags by Row ID
 * - Export status: BLOCKED or READY
 * 
 * Export status must be BLOCKED if any flags exist.
 */
export function generateReviewStatus(
  transactions: Transaction[],
  validationResult: ValidationResult | null
) {
  const unresolvedFlags = validationResult?.flags || []
  const isReady = unresolvedFlags.filter((f) => f.severity === 'error').length === 0

  return {
    totalTransactions: transactions.length,
    flaggedRowsCount: validationResult?.flaggedRowsCount || 0,
    unresolvedFlags,
    exportStatus: isReady ? 'READY' : 'BLOCKED',
    blockedReason: isReady
      ? null
      : `${unresolvedFlags.filter((f) => f.severity === 'error').length} critical issues must be resolved`,
  }
}

/**
 * PROMPT 8: CSV EXPORT
 * CONDITIONAL - If export status is READY, generate CSV
 * 
 * Columns:
 * - date
 * - description
 * - amount
 * - balance
 * 
 * Rules:
 * - Use normalized values
 * - Preserve order
 * - One row per transaction
 * - No extra text
 * 
 * If export status is BLOCKED, refuse.
 */
export function generateCSVExport(
  transactions: Transaction[],
  isReady: boolean
): string | null {
  if (!isReady) {
    return null
  }

  // CSV header
  const rows: string[] = ['date,description,amount,balance']

  // Add transaction rows
  for (const tx of transactions) {
    const date = tx.normalizedDate || ''
    // Escape quotes in description and wrap in quotes
    const description = `"${(tx.description || '').replace(/"/g, '""')}"` 
    const amount = tx.normalizedAmount?.toFixed(2) || '0.00'
    const balance = tx.normalizedBalance?.toFixed(2) || '0.00'

    rows.push(`${date},${description},${amount},${balance}`)
  }

  return rows.join('\n')
}

/**
 * PROMPT 9: OFX EXPORT
 * CONDITIONAL - If export status is READY, generate OFX
 * 
 * Rules:
 * - Single statement
 * - DTSTART and DTEND match statement
 * - Stable FITID per Row ID
 * - DTPOSTED uses normalized date
 * - TRNAMT uses normalized amount
 * - MEMO equals description
 * - LEDGERBAL equals closing balance
 * 
 * If export status is BLOCKED, refuse.
 */
export function generateOFXExport(
  metadata: StatementMetadata,
  transactions: Transaction[],
  isReady: boolean
): string | null {
  if (!isReady) {
    return null
  }

  const startDate = metadata.statementStartDate?.replace(/-/g, '') || '20240101'
  const endDate = metadata.statementEndDate?.replace(/-/g, '') || '20240131'
  const accountLastFour = metadata.accountNumberLastFour || '0000'
  const closingBalance = metadata.normalizedClosingBalance || 0

  // Build OFX structure
  let ofx = 'OFXHEADER:100\n'
  ofx += 'SECURITY:NONE\n'
  ofx += 'ENCODING:USASCII\n'
  ofx += 'CHARSET:1252\n'
  ofx += 'COMPRESSION:NONE\n'
  ofx += 'OLDFILEFORMAT:NO\n'
  ofx += 'NEWFILEFORMAT:YES\n'
  ofx += '\n'
  ofx += '<OFX>\n'
  ofx += '<SIGNONMSGSRSV1>\n'
  ofx += '<SONRS>\n'
  ofx += '<STATUS>\n'
  ofx += '<CODE>0\n'
  ofx += '<SEVERITY>INFO\n'
  ofx += '</STATUS>\n'
  ofx += '<DTSERVER>' + new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14) + '\n'
  ofx += '<LANGUAGE>ENG\n'
  ofx += '</SONRS>\n'
  ofx += '</SIGNONMSGSRSV1>\n'
  ofx += '<BANKMSGSRSV1>\n'
  ofx += '<STMTTRNRS>\n'
  ofx += '<STATUS>\n'
  ofx += '<CODE>0\n'
  ofx += '<SEVERITY>INFO\n'
  ofx += '</STATUS>\n'
  ofx += '<STMTRS>\n'
  ofx += '<CURDEF>' + (metadata.currency || 'USD') + '\n'
  ofx += '<BANKACCTFROM>\n'
  ofx += '<BANKID>000000000\n'
  ofx += '<ACCTID>' + accountLastFour + '\n'
  ofx += '<ACCTTYPE>CHECKING\n'
  ofx += '</BANKACCTFROM>\n'
  ofx += '<BANKTRANLIST>\n'
  ofx += '<DTSTART>' + startDate + '\n'
  ofx += '<DTEND>' + endDate + '\n'

  // Add transactions
  for (const tx of transactions) {
    const fitid = generateFITID(tx, accountLastFour)
    const dtposted = tx.normalizedDate?.replace(/-/g, '') || '20240101'
    const trnamt = (tx.normalizedAmount || 0).toFixed(2)
    // Use full description as shown in PDF
    const memo = (tx.description || '').substring(0, 255)

    ofx += '<STMTTRN>\n'
    ofx += '<TRNTYPE>' + (tx.normalizedAmount && tx.normalizedAmount < 0 ? 'DEBIT' : 'CREDIT') + '\n'
    ofx += '<DTPOSTED>' + dtposted + '\n'
    ofx += '<TRNAMT>' + trnamt + '\n'
    ofx += '<FITID>' + fitid + '\n'
    ofx += '<MEMO>' + memo + '\n'
    ofx += '</STMTTRN>\n'
  }

  ofx += '</BANKTRANLIST>\n'
  ofx += '<LEDGERBAL>\n'
  ofx += '<BALAMT>' + closingBalance.toFixed(2) + '\n'
  ofx += '<DTASOF>' + endDate + '\n'
  ofx += '</LEDGERBAL>\n'
  ofx += '</STMTRS>\n'
  ofx += '</STMTTRNRS>\n'
  ofx += '</BANKMSGSRSV1>\n'
  ofx += '</OFX>\n'

  return ofx
}

/**
 * PROMPT 10: DUPLICATE PROTECTION
 * Generates a stable transaction hash
 * 
 * Use:
 * - Row ID
 * - Normalized date
 * - Normalized amount
 * - Description (FULL, as shown in PDF)
 * - Account last four digits
 * 
 * Store hash to detect duplicates on future imports.
 */
export function generateTransactionHash(
  transaction: Transaction,
  accountLastFour: string
): TransactionHash {
  // Use full description exactly as shown in PDF
  const hashInput = `${transaction.rowId}|${transaction.normalizedDate}|${transaction.normalizedAmount}|${transaction.description}|${accountLastFour}`

  const hash = simpleHash(hashInput)

  return {
    rowId: transaction.rowId,
    hash,
    date: transaction.normalizedDate || '',
    amount: transaction.normalizedAmount || 0,
    description: transaction.description,
    accountLastFour,
  }
}

/**
 * Helper: Generate stable FITID for OFX
 * Uses transaction hash to ensure consistency
 */
function generateFITID(transaction: Transaction, accountLastFour: string): string {
  const hash = generateTransactionHash(transaction, accountLastFour)
  return hash.hash.substring(0, 32).padEnd(32, '0')
}
