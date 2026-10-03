import type { AIProvider } from "./AIProvider";
import { MockAIProvider } from "./providers/mockProvider";
import { AnthropicAIProvider } from "./providers/anthropicProvider";
import { GeminiAIProvider } from "./providers/geminiProvider";
import { env } from "../config/env";

let cached: AIProvider | undefined;

export function getAIProvider(): AIProvider {
  if (!cached) {
    cached =
      env.AI_PROVIDER === "anthropic"
        ? new AnthropicAIProvider()
        : env.AI_PROVIDER === "gemini"
          ? new GeminiAIProvider()
          : new MockAIProvider();
  }
  return cached;
}

export type { AIProvider } from "./AIProvider";
export * from "./types";