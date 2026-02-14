# Bookkeeping Statement Parser

A professional, user-friendly web application for parsing, validating, editing, and exporting monthly bookkeeping statements. Built with Next.js, TypeScript, and shadcn/ui.

## Features

### 📋 Core Functionality

- **Document Validation (PROMPT 1)**: Validates PDF statements meet requirements (one account, bank/credit card, single currency, monthly period, opening/closing balances)
- **Metadata Extraction (PROMPT 2)**: Extracts and displays statement metadata (institution, account name, dates, balances, currency)
- **Transaction Extraction (PROMPT 3)**: Extracts all transactions with stable Row IDs, preserving original order and values
- **Normalization (PROMPT 4)**: Normalizes transactions (YYYY-MM-DD dates, debits as negative, credits as positive, two decimals)
- **Reconciliation (PROMPT 5)**: Validates opening balance + transactions = closing balance, checks running balance integrity, validates dates within statement range
- **Inline Editing (PROMPT 6)**: Edit transactions directly in the table, preserves original values, re-validates after each edit
- **Review Status (PROMPT 7)**: Displays current validation status, flagged rows, and export readiness
- **CSV Export (PROMPT 8)**: Exports validated statements as CSV (date, description, amount, balance)
- **OFX Export (PROMPT 9)**: Exports validated statements in OFX format for accounting software import
- **Duplicate Protection (PROMPT 10)**: Generates stable transaction hashes for duplicate detection on future imports

### 🎨 User Experience

- **Clean, Professional Design**: Apple Minimalist aesthetic with intuitive navigation
- **Real-time Validation**: Immediate feedback on data issues with severity levels (errors vs warnings)
- **Drag & Drop Upload**: Easy PDF file upload with drag-and-drop support
- **Inline Editing**: Edit transactions directly in the table with visual feedback
- **Export Blocking**: Prevents export until all critical validation issues are resolved
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode Support**: Built-in dark mode support via next-themes

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: lucide-react
- **Cryptography**: Node.js crypto (for transaction hashing)

## Project Structure

```
bookkeeping-parser/
├── app/
│   ├── layout.tsx           # Root layout with metadata
│   ├── page.tsx             # Main application page
│   └── globals.css          # Global styles
├── components/
│   ├── DocumentGate.tsx      # PDF upload and validation
│   ├── MetadataDisplay.tsx   # Statement metadata display
│   ├── TransactionTable.tsx  # Transactions with inline editing
│   ├── ReviewStatus.tsx      # Validation status and export readiness
│   ├── ExportPanel.tsx       # CSV and OFX export options
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── types.ts             # TypeScript type definitions
│   ├── parser.ts            # Core parser logic (all 10 prompts)
│   └── utils.ts             # Utility functions
├── public/                  # Static assets
└── package.json             # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun package manager

### Installation

```bash
# Clone or navigate to the project
cd bookkeeping-parser

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## Usage

### 1. Upload Statement

1. Click "Select PDF File" or drag and drop a PDF
2. System validates the document meets requirements
3. If validation passes, proceeds to review step

### 2. Review Metadata

- View extracted statement metadata (institution, account, dates, balances)
- Verify all information is correct
- Check validation status for any issues

### 3. Review Transactions

- View all extracted transactions in table format
- Each transaction shows: Row ID, Date, Description, Debit, Credit, Balance
- Validation flags highlight any issues (errors in red, warnings in yellow)

### 4. Edit Transactions (if needed)

- Click the edit icon on any transaction
- Modify the description or other fields
- Click checkmark to save or X to cancel
- System re-validates immediately after each edit
- Original values are preserved for audit trail

### 5. Check Export Readiness

- Review Status section shows:
  - Total transactions
  - Flagged rows count
  - Critical errors and warnings
  - Export status (READY or BLOCKED)
- All critical errors must be resolved before export

### 6. Export Statement

Once validation passes (READY status):

- **CSV Export**: Download as comma-separated values
  - Columns: date, description, amount, balance
  - Compatible with Excel, Google Sheets, accounting software
  
- **OFX Export**: Download in Open Financial Exchange format
  - Direct import support in QuickBooks, Xero, Wave
  - Includes stable FITID for duplicate detection
  - Complete statement with opening/closing balances

## Data Validation Rules

### Document Gate (PROMPT 1)
- ✅ Exactly one account per PDF
- ✅ Bank or credit card statement
- ✅ Statement start and end dates present
- ✅ Opening and closing balances present
- ✅ Single currency

### Normalization (PROMPT 4)
- Dates converted to YYYY-MM-DD format
- Debits stored as negative amounts
- Credits stored as positive amounts
- All amounts rounded to 2 decimal places
- Currency symbols removed

### Reconciliation (PROMPT 5)
- Opening Balance + Sum of Transactions = Closing Balance
- Running balance integrity checked for each transaction
- All transaction dates within statement period
- Rounding tolerance: ±0.01

### Export Blocking (PROMPT 8 & 9)
- Export blocked if any critical errors exist
- Warnings do not block export
- User must resolve all errors before export
- Export status clearly displayed

## API Reference

### Parser Functions

All parser functions are in `lib/parser.ts`:

```typescript
// Validate document meets requirements
validateDocument(metadata: StatementMetadata): { status: 'PASS' | 'BLOCK', reasons: string[] }

// Extract metadata from PDF
extractMetadata(pdfText: string): StatementMetadata

// Extract transactions from PDF
extractTransactions(pdfText: string): Transaction[]

// Normalize transactions for processing
normalizeTransactions(transactions: Transaction[]): { normalized: Transaction[], errors: ValidationFlag[] }

// Reconcile statement
reconcileStatement(metadata: StatementMetadata, transactions: Transaction[]): ValidationResult

// Apply user edit
applyEdit(transaction: Transaction, field: string, newValue: string | null): Transaction

// Generate review status
generateReviewStatus(transactions: Transaction[], validationResult: ValidationResult | null): ReviewStatus

// Generate CSV export
generateCSVExport(transactions: Transaction[], isReady: boolean): string | null

// Generate OFX export
generateOFXExport(metadata: StatementMetadata, transactions: Transaction[], isReady: boolean): string | null

// Generate transaction hash for duplicate detection
generateTransactionHash(transaction: Transaction, accountLastFour: string): TransactionHash
```

## Type Definitions

See `lib/types.ts` for complete type definitions:

- `Transaction`: Individual transaction with all fields
- `StatementMetadata`: Statement-level metadata
- `ValidationFlag`: Validation issue with severity
- `ValidationResult`: Overall validation result
- `ParserState`: Application state
- `ExportStatus`: Export readiness status
- `CSVRow`: CSV export row
- `TransactionHash`: Duplicate detection hash

## Demo Mode

The application includes a demo mode with sample data:

1. Click "Select PDF File" button
2. System loads sample statement with 7 transactions
3. Demonstrates all features:
   - Metadata extraction
   - Transaction display
   - Validation (all pass)
   - Inline editing
   - CSV/OFX export

Perfect for testing and demonstration without actual PDF files.

## Production Considerations

### PDF Parsing

Current implementation uses demo data. For production:

1. Install PDF parsing library:
   ```bash
   npm install pdf-parse pdfjs-dist
   ```

2. Update `extractMetadata()` and `extractTransactions()` in `lib/parser.ts` to parse actual PDF files

3. Implement OCR if statements are scanned images:
   ```bash
   npm install tesseract.js
   ```

### Database Integration

For persistent storage:

1. Set up PostgreSQL database
2. Install Prisma:
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

3. Define schema for statements and transactions
4. Store validation history and audit trail

### API Integration

For accounting software integration:

1. Implement OAuth for QuickBooks, Xero, Wave
2. Add API endpoints for direct import
3. Implement webhook support for real-time sync

### Security

- Validate all file uploads (size, type, content)
- Sanitize user input in edits
- Implement rate limiting for exports
- Add authentication for multi-user access
- Encrypt sensitive data at rest

## Troubleshooting

### Dev Server Won't Start

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Build Errors

```bash
# Check TypeScript errors
npm run type-check

# Lint code
npm run lint
```

### Export Not Working

- Verify all critical validation errors are resolved
- Check browser console for JavaScript errors
- Ensure transactions have normalized amounts

## Contributing

1. Follow TypeScript best practices
2. Add comments explaining complex logic
3. Test changes with demo data
4. Update README for new features

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments
3. Check browser console for errors
4. Verify all validation rules are met

---

**Built with ❤️ using Next.js, TypeScript, and shadcn/ui**
