/**
 * Generates a batch number in the format:
 * BCH + YYMMDD + SSS + NNNNNNNNNN
 * e.g. BCH260706C019999999999
 */
export function generateBatchNo(storeCode?: string | null, date: Date = new Date()): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const store = normalizeStoreCode(storeCode);
  const random = String(Math.floor(Math.random() * 1e10)).padStart(10, '0');
  return `BCH${year}${month}${day}${store}${random}`;
}

function normalizeStoreCode(storeCode?: string | null): string {
  const code = (storeCode || '').trim().toUpperCase();
  if (!code) {
    return '000';
  }
  if (code.length >= 3) {
    return code.slice(0, 3);
  }
  return code.padEnd(3, '0');
}
