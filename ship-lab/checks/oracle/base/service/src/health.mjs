// The health check behind GET /healthz. STARTER CODE: it only says the process is running (milestone 8 makes it exercise the feature).
//   checkHealth(deps) -> { ok: boolean, checks: { <name>: <what it found> } }
export async function checkHealth(deps) {
  return { ok: true, checks: { process: 'running' } };
}
