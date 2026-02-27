// ============================================================
// CashMosaic — Duplicate Detection
// Computes SHA-256 hash using the Web Crypto API (no dependencies).
// The hash is stored in transactions.row_hash with a UNIQUE constraint.
// ============================================================

async function sha256(message: string): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function computeRowHash(
  accountId: string,
  date: string,
  amount: number,
  description: string
): Promise<string> {
  const canonical = `${accountId}|${date}|${amount.toFixed(2)}|${description.trim().toUpperCase()}`;
  return sha256(canonical);
}

export async function computeRowHashes(
  transactions: Array<{ accountId: string; date: string; amount: number; description: string }>
): Promise<string[]> {
  return Promise.all(
    transactions.map(tx => computeRowHash(tx.accountId, tx.date, tx.amount, tx.description))
  );
}
