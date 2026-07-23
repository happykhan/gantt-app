import { read, utils } from 'xlsx'

export function spreadsheetRows(buffer) {
  const workbook = read(buffer, { type: 'array', cellDates: false })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!worksheet) return []
  return utils.sheet_to_json(worksheet, { header: 1, defval: '' })
}
