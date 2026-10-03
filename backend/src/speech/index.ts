import type { SpeechProvider } from "./SpeechProvider";
import { MockSpeechProvider } from "./providers/mockSpeechProvider";
import { OpenAIWhisperProvider } from "./providers/openaiWhisperProvider";
import { GeminiSpeechProvider } from "./providers/geminiSpeechProvider";
import { env } from "../config/env";

let cached: SpeechProvider | undefined;

export function getSpeechProvider(): SpeechProvider {
  if (!cached) {
    cached =
      env.SPEECH_PROVIDER === "openai"
        ? new OpenAIWhisperProvider()
        : env.SPEECH_PROVIDER === "gemini"
          ? new GeminiSpeechProvider()
          : new MockSpeechProvider();
  }
  return cached;
}

export type { SpeechProvider } from "./SpeechProvider";