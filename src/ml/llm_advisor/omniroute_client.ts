/**
 * Cliente OpenAI-compatible via OmniRoute (DeepSeek v4 flash).
 * Credenciais: OMNIROUTE_BASE_URL / OMNIROUTE_API_KEY / OMNIROUTE_MODEL
 */

import type { LlmCompletionPort } from './advisor_engine';
import { TemplateLlmAdapter } from './advisor_engine';

export const OMNIROUTE_DEFAULT_BASE_URL = 'http://localhost:20128/v1';
/** DeepSeek V4 mais simples/barato no catálogo local OmniRoute. */
export const OMNIROUTE_DEFAULT_MODEL = 'kc/deepseek/deepseek-v4-flash';

export type OmniRouteConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
};

export function loadOmniRouteConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OmniRouteConfig | null {
  const apiKey =
    env.OMNIROUTE_API_KEY?.trim() || env.OMNIROUTE_KEY?.trim() || '';
  if (!apiKey) return null;
  return {
    baseUrl: (
      env.OMNIROUTE_BASE_URL?.trim() || OMNIROUTE_DEFAULT_BASE_URL
    ).replace(/\/$/, ''),
    apiKey,
    model: env.OMNIROUTE_MODEL?.trim() || OMNIROUTE_DEFAULT_MODEL,
    timeoutMs: Number(env.OMNIROUTE_TIMEOUT_MS ?? 60_000) || 60_000,
  };
}

export class OmniRouteLlmAdapter implements LlmCompletionPort {
  readonly name: string;

  constructor(private readonly config: OmniRouteConfig) {
    this.name = `omniroute:${config.model}`;
  }

  async complete(system: string, user: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 60_000,
    );
    try {
      const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0.25,
          max_tokens: 2200,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: controller.signal,
      });
      const raw = (await res.json().catch(() => null)) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
      } | null;
      if (!res.ok) {
        const msg = raw?.error?.message ?? `OmniRoute HTTP ${res.status}`;
        throw new Error(msg);
      }
      const content = raw?.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('OmniRoute retornou conteúdo vazio');
      return content;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createDefaultLlmPort(): LlmCompletionPort {
  const cfg = loadOmniRouteConfigFromEnv();
  if (cfg) return new OmniRouteLlmAdapter(cfg);
  return new TemplateLlmAdapter();
}
