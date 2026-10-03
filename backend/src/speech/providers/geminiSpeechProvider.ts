import type { SpeechProvider } from "../SpeechProvider";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { logger } from "../../utils/logger";

/**
 * Free alternative to OpenAIWhisperProvider: sends the audio directly to
 * Gemini (which accepts inline audio in its generateContent request) and
 * asks it to transcribe exactly what was said. Reuses AI_API_KEY rather
 * than SPEECH_API_KEY, since this only makes sense paired with
 * AI_PROVIDER=gemini — the same Google AI Studio key covers both.
 */
export class GeminiSpeechProvider implements SpeechProvider {
  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    if (!env.AI_API_KEY) {
      throw ApiError.badRequest(
        "SPEECH_PROVIDER=gemini but AI_API_KEY is not set. Set AI_API_KEY (a Google AI Studio key) in .env."
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL}:generateContent?key=${env.AI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Transcribe exactly what is spoken in this audio clip. Reply with ONLY the transcribed words — " +
                  "no punctuation commentary, no markdown, no quotes around it, no description of tone or background " +
                  "noise. If no speech is audible, reply with an empty response.",
              },
              { inlineData: { mimeType, data: audioBuffer.toString("base64") } },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("Gemini speech-to-text request failed", { status: response.status, body });
      throw ApiError.badRequest("Speech-to-text request failed");
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return text.trim();
  }
}