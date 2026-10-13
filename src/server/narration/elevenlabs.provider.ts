import "server-only";
import { AppError, describeError } from "@/server/security/errors";

/** Turns text into spoken audio (MP3 bytes). */
export interface SpeechProvider {
  /** Identifies the voice and model, so cached audio is never reused across a voice change. */
  readonly voiceKey: string;
  synthesize(text: string): Promise<Uint8Array>;
}

const API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const TIMEOUT_MS = 15_000;

/** ElevenLabs text-to-speech. The API key stays on the server; browsers only talk to our route. */
export function createElevenLabsProvider(options: { apiKey: string; voiceId: string; modelId: string }): SpeechProvider {
  const { apiKey, voiceId, modelId } = options;
  return {
    voiceKey: `elevenlabs:${voiceId}:${modelId}`,

    async synthesize(text) {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        console.error("ElevenLabs request failed", describeError(err));
        throw new AppError("SERVICE_UNAVAILABLE", "The voice service didn't answer. Try again in a moment.", { cause: err });
      }
      if (res.status === 429) {
        throw new AppError("RATE_LIMITED", "The voice service is busy. Try again in a moment.", { retryAfterSeconds: 10 });
      }
      if (!res.ok) {
        // 401/403 mean a bad key or missing permission; log the body for the operator, never the client.
        const detail = await res.text().catch(() => "");
        console.error(`ElevenLabs returned ${res.status}`, detail.slice(0, 300));
        throw new AppError("SERVICE_UNAVAILABLE", "Narration isn't available right now.");
      }
      return new Uint8Array(await res.arrayBuffer());
    },
  };
}
