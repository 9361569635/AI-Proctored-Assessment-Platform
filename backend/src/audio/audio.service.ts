import { ApiError } from "../utils/ApiError";

/**
 * Audio services are not used by the current assessment flow.
 *
 * Session 4 is now:
 *   Sentence Correction
 *
 * The previous Listen-and-Repeat implementation required:
 *   - text-to-speech / synthesize()
 *   - audio prompt generation
 *   - candidate audio recording
 *   - speech-to-text communication scoring
 *
 * The current assessment does not use that flow.
 *
 * Keep this service file temporarily so existing imports/routes do not
 * break the application. Audio functionality can be reintroduced later
 * if an actual audio-based assessment session is added.
 */

export const MAX_AUDIO_BYTES =
  10 * 1024 * 1024;

export const SUPPORTED_AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
] as const;

/**
 * Legacy Listen-and-Repeat prompt endpoint.
 *
 * Session 4 is currently Sentence Correction, therefore there is no
 * server-generated audio prompt.
 */
export async function getPromptAudio(_params: {
  candidateId: string;
  sessionId: string;
  questionId: string;
}): Promise<never> {
  throw ApiError.badRequest(
    "Audio prompts are not available for the current Sentence Correction assessment."
  );
}

/**
 * Legacy Listen-and-Repeat response endpoint.
 *
 * Candidate audio responses are not part of the current assessment flow.
 */
export async function submitAudioResponse(_params: {
  candidateId: string;
  sessionId: string;
  questionId: string;
  buffer: Buffer;
  mimetype: string;
}): Promise<never> {
  throw ApiError.badRequest(
    "Audio responses are not available for the current Sentence Correction assessment."
  );
}

/**
 * Legacy helper.
 *
 * The current assessment does not create audio responses.
 */
export async function getAudioResponsesForSession(
  _candidateId: string,
  _assessmentSessionId: string
): Promise<
  Array<{
    questionId: string;
    transcript: string;
    communicationScore: number;
  }>
> {
  return [];
}

/**
 * Legacy Listen-and-Repeat completion gate.
 *
 * Session 4 is now Sentence Correction, so this function is not used
 * by the current assessment flow.
 */
export async function haveAllListenRepeatQuestionsAnswered(
  _candidateId: string,
  _assessmentSessionId: string
): Promise<boolean> {
  return false;
}

/**
 * Legacy communication-session scoring.
 *
 * The current Session 4 is Sentence Correction and its score is calculated
 * through the normal assessment answer/scoring flow.
 */
export async function computeCommunicationSessionScore(
  _candidateId: string,
  _assessmentSessionId: string
): Promise<number> {
  return 0;
}