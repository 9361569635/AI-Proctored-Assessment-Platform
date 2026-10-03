import type { SpeechProvider } from "../SpeechProvider";
import { logger } from "../../utils/logger";

/**
 * Unlike MockAIProvider (which can meaningfully fake resume parsing via
 * keyword matching, or MCQ generation via a static bank), there's no
 * honest way to deterministically "transcribe" arbitrary audio without a
 * real speech model. Returning an empty transcript — rather than a fake
 * one — is the correct default: it makes every communication score come
 * back low, which is visibly a placeholder rather than silently wrong data.
 * Set SPEECH_PROVIDER=openai + SPEECH_API_KEY for real transcription.
 */
export class MockSpeechProvider implements SpeechProvider {
  async transcribe(_audioBuffer: Buffer, _mimeType: string): Promise<string> {
    logger.warn(
      "MockSpeechProvider.transcribe() called — returning an empty transcript. Set SPEECH_PROVIDER=openai and SPEECH_API_KEY for real speech-to-text."
    );
    return "";
  }
}
