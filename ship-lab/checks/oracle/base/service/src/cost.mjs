// What a request costs, what a month will cost, and when to be told. STARTER CODE: nothing is calculated yet (milestone 5 writes it).
//   estimateCost({ inputTokens, outputTokens }, modelId, prices)            -> dollars (a number)
//   projectMonthly({ requestsPerMonth, avgInputTokens, avgOutputTokens }, { model, prices }) -> { perRequestUSD, monthlyUSD }
//   costAlert({ projectedMonthlyUSD, capUSD, warnAt })                       -> { level: 'ok' | 'warn' | 'breach', ratio }
export function estimateCost(usage, modelId, prices) {
  return null;
}

export function projectMonthly(volume, options) {
  return null;
}

export function costAlert(input) {
  return null;
}
