// What a request costs, what a month will cost, and when to be told.
export function estimateCost(usage, modelId, prices) {
  const p = prices?.[modelId];
  if (!p) throw new Error(`no price for the model "${modelId}"`);
  return (usage.inputTokens * p.inPerM + usage.outputTokens * p.outPerM) / 1e6;
}

export function projectMonthly({ requestsPerMonth, avgInputTokens, avgOutputTokens }, { model, prices }) {
  const perRequestUSD = estimateCost({ inputTokens: avgInputTokens, outputTokens: avgOutputTokens }, model, prices);
  return { perRequestUSD, monthlyUSD: perRequestUSD * requestsPerMonth };
}

/** ok below the warning line, warn from the warning line up to the cap, breach above the cap. */
export function costAlert({ projectedMonthlyUSD, capUSD, warnAt = 0.8 }) {
  const ratio = projectedMonthlyUSD / capUSD;
  return { level: ratio > 1 ? 'breach' : ratio >= warnAt ? 'warn' : 'ok', ratio };
}
