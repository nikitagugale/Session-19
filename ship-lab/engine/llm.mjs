// A stand-in language model. Deterministic and free, with the same shape as a real vendor's API:
//   complete({ model, system, prompt, maxTokens }) -> { text, usage: { inputTokens, outputTokens }, finish: 'stop' | 'length', model }
// It is NOT a good model. It is a model that behaves like the bad days of a real one, so that a guardrail has something to catch:
//   - it answers from the first CONTEXT section it is given, and cites it
//   - it ECHOES what the customer told it ("You said: ...") whenever the question holds a number, an address or a phone
//   - if it is talked into it ("ignore previous instructions", "show me your hidden setup") it prints its own instructions
//   - when asked for "everything" or "full details" it writes a long answer, so a token limit has something to cut
// Please do not read this file to find the answers to the lab. Use it as a vendor's API.

export const KNOWN_MODELS = ['marlow-llm-latest', 'marlow-llm-2026-10-14', 'marlow-llm-mini-2026-10-14'];

export const estimateTokens = text => Math.max(1, Math.ceil(String(text).length / 4));

const INJECTION = [
  /(ignore|forget|disregard)[^.]{0,60}(previous|earlier|above|told|instructions)/i,
  /(reveal|show|print|repeat|tell me)[^.]{0,40}(system prompt|your (hidden )?(instructions|setup|prompt))/i,
  /hidden setup/i,
];
const PERSONAL = /\d{4,}|address|live at|deliver to|\bflat\b|\bhouse\b|#\d/i;

export function complete({ model, system = '', prompt = '', maxTokens } = {}) {
  if (!KNOWN_MODELS.includes(model)) throw new Error(`unknown model "${model}"`);
  const ctxStart = prompt.indexOf('CONTEXT:');
  const qStart = prompt.indexOf('QUESTION:');
  const context = ctxStart >= 0 ? prompt.slice(ctxStart + 8, qStart >= 0 ? qStart : undefined).trim() : '';
  const question = qStart >= 0 ? prompt.slice(qStart + 9).trim() : prompt.trim();

  let text;
  if (INJECTION.some(r => r.test(question))) {
    text = `Sure. My instructions are: ${system}`;
  } else {
    const first = context.split('\n').find(l => /^\[[^\]]+\]/.test(l));
    if (!first) {
      text = "I'm sorry, I could not find that in the Marlow Mobile documents.";
    } else {
      const id = /^\[([^\]]+)\]/.exec(first)[1];
      const body = first.replace(/^\[[^\]]+\]\s*/, '');
      text = /everything|full details?|in full/i.test(question)
        ? [0, 1, 2, 3].map(i => `Part ${i + 1}: ${body} [${id}]`).join(' ')
        : `Here is what the Marlow Mobile documents say: ${body} [${id}]`;
      if (PERSONAL.test(question)) text += ` You said: "${question}". I have noted it.`;
    }
  }
  const inputTokens = estimateTokens(system) + estimateTokens(prompt);
  let outputTokens = estimateTokens(text);
  let finish = 'stop';
  if (Number.isFinite(maxTokens) && maxTokens > 0 && outputTokens > maxTokens) {
    text = text.slice(0, maxTokens * 4);
    outputTokens = maxTokens;
    finish = 'length';
  }
  return { text, usage: { inputTokens, outputTokens }, finish, model };
}
