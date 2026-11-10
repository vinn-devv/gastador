export type ParsedQrExpense = { amount: string; merchant: string };

export function parseQrExpense(payload: string): ParsedQrExpense | null {
  const value = payload.trim();
  if (!value) return null;

  try {
    const json = JSON.parse(value) as Record<string, unknown>;
    const amount = String(json.amount ?? json.total ?? json.transactionAmount ?? "");
    const merchant = String(json.merchantName ?? json.merchant ?? json.name ?? "QR expense");
    if (/^\d+(?:\.\d{1,2})?$/.test(amount) && Number(amount) > 0) return { amount, merchant };
  } catch {
  }

  const amountMatch = value.match(/(?:amount|total|am)[=:]\s*(\d+(?:\.\d{1,2})?)/i);
  if (amountMatch && Number(amountMatch[1]) > 0) {
    const merchantMatch = value.match(/(?:merchant|merchantName|name)[=:]([^&|]+)/i);
    return { amount: amountMatch[1], merchant: merchantMatch?.[1]?.trim() || "QR expense" };
  }

  let offset = 0;
  let amount = "";
  let merchant = "";
  while (offset + 4 <= value.length) {
    const tag = value.slice(offset, offset + 2);
    const lengthText = value.slice(offset + 2, offset + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) break;
    const length = Number(lengthText);
    const data = value.slice(offset + 4, offset + 4 + length);
    if (data.length !== length) break;
    if (tag === "54") amount = data;
    if (tag === "59") merchant = data;
    offset += 4 + length;
  }
  if (/^\d+(?:\.\d{1,2})?$/.test(amount) && Number(amount) > 0) {
    return { amount, merchant: merchant || "QR expense" };
  }
  return null;
}