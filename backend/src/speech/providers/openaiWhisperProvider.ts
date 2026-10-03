import type { SpeechProvider } from "../SpeechProvider";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { logger } from "../../utils/logger";

/**
 * Calls OpenAI's Whisper transcription endpoint. Anthropic doesn't offer a
 * speech-to-text endpoint, so this intentionally uses a different vendor
 * via SPEECH_API_KEY — separate from AI_API_KEY. Swap this file for a
 * different STT vendor without touching any caller; they only ever see the
 * SpeechProvider interface.
 */
export class OpenAIWhisperProvider implements SpeechProvider {
  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    if (!env.SPEECH_API_KEY) {
      throw ApiError.badRequest(
        "SPEECH_PROVIDER=openai but SPEECH_API_KEY is not set. Set SPEECH_API_KEY in .env, or use SPEECH_PROVIDER=mock for local dev."
      );
    }

    const extension = mimeType.includes("webm")
      ? "webm"
      : mimeType.includes("wav")
        ? "wav"
        : mimeType.includes("ogg")
          ? "ogg"
          : "mp3";

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: mimeType }), `response.${extension}`);
    formData.append("model", "whisper-1");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.SPEECH_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("Speech-to-text request failed", { status: response.status, body });
      throw ApiError.badRequest("Speech-to-text request failed");
    }

    const data = (await response.json()) as { text: string };
    return data.text ?? "";
  }
}
