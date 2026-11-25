// What a request costs, what a month will cost, and when to be told.
// Prices are dollars per MILLION tokens, and input and output are priced separately (output costs more).
export function estimateCost({ inputTokens, outputTokens }, modelId, prices) {
  const p = prices?.[modelId];
  if (!p) throw new Error(`no price for model "${modelId}"`);
  return (inputTokens * p.inPerM + outputTokens * p.outPerM) / 1e6;
}

export function projectMonthly({ requestsPerMonth, avgInputTokens, avgOutputTokens }, { model, prices }) {
  const perRequestUSD = estimateCost({ inputTokens: avgInputTokens, outputTokens: avgOutputTokens }, model, prices);
  return { perRequestUSD, monthlyUSD: perRequestUSD * requestsPerMonth };
}

// ok below the warning line; warn from the line up to AND including the cap; breach above the cap.
export function costAlert({ projectedMonthlyUSD, capUSD, warnAt = 0.8 }) {
  const ratio = projectedMonthlyUSD / capUSD;
  const level = ratio > 1 ? 'breach' : ratio >= warnAt ? 'warn' : 'ok';
  return { level, ratio };
}
