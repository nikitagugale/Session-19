// OPTIONAL live mode: the same complete() call, against a real provider that speaks the OpenAI chat format (OpenRouter by default).
// Nothing in the lab needs it. The hidden checks always run on the offline stand-in. The key comes from the environment only:
//   LLM_MODE=live  LLM_API_KEY=...  LLM_MODEL=<the provider's model id>  [LLM_BASE_URL=https://openrouter.ai/api/v1]
// It never writes the key anywhere and never logs it.
export function createLive({ baseUrl = 'https://openrouter.ai/api/v1', apiKey, model, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) throw new Error('live mode needs LLM_API_KEY in the environment');
  if (!model) throw new Error('live mode needs LLM_MODEL in the environment');
  return {
    async complete({ system = '', prompt = '', maxTokens, signal } = {}) {
      const res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
        signal,
      });
      if (!res.ok) throw new Error(`the provider answered ${res.status}`);
      const j = await res.json();
      const choice = j.choices?.[0];
      return {
        text: choice?.message?.content ?? '',
        usage: { inputTokens: j.usage?.prompt_tokens ?? 0, outputTokens: j.usage?.completion_tokens ?? 0 },
        finish: choice?.finish_reason === 'length' ? 'length' : 'stop',
        model,
      };
    },
  };
}
