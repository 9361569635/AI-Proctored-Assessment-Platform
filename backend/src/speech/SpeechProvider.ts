/**
 * Speech-to-text abstraction for the Communication (listen-and-repeat)
 * session — spec §11: "Speech is converted to text". Kept separate from
 * AIProvider since transcription and text analysis are different
 * capabilities that may reasonably come from different vendors (e.g.
 * Whisper for STT, Claude for the accuracy/fluency scoring in
 * AIProvider.analyzeCommunication).
 */
export interface SpeechProvider {
  transcribe(audioBuffer: Buffer, mimeType: string): Promise<string>;
}
