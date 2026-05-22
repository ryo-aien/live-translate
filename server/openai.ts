import type { Direction, LanguageCode } from "../src/types/translation.js";

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  ja: "Japanese",
  en: "English",
  zh: "Chinese",
  ko: "Korean",
};

export async function createRealtimeSession(
  direction: Direction,
  partnerLanguage: LanguageCode
): Promise<{ clientSecret: string; expiresAt: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const sourceLang =
    direction === "me_to_partner" ? "Japanese" : LANGUAGE_NAMES[partnerLanguage];
  const targetLang =
    direction === "me_to_partner" ? LANGUAGE_NAMES[partnerLanguage] : "Japanese";

  const instructions = `You are a real-time interpreter.
The user will speak in ${sourceLang}.
Translate what they say into ${targetLang} and speak it out loud immediately.
Do not add explanations, notes, or any text other than the translation itself.
Keep the tone and register of the original speech.`;

  const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "alloy",
      instructions,
      input_audio_transcription: {
        model: "whisper-1",
      },
      turn_detection: null,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI session creation failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const clientSecret = data.client_secret?.value;
  const expiresAt = data.client_secret?.expires_at ?? Math.floor(Date.now() / 1000) + 60;

  if (!clientSecret) throw new Error("No client_secret in response");

  return { clientSecret, expiresAt };
}
