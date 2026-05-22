type Direction = "me_to_partner" | "partner_to_me";

type SessionResponse = {
  clientSecret: string;
  expiresAt: number;
};

export async function createTranslationSession(
  direction: Direction,
  partnerLanguage: string
): Promise<SessionResponse> {
  const outputLanguage = direction === "me_to_partner" ? partnerLanguage : "ja";

  const res = await fetch(
    "https://api.openai.com/v1/realtime/translations/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          model: "gpt-realtime-translate",
          audio: {
            input: {
              transcription: { model: "gpt-realtime-whisper" },
            },
            output: { language: outputLanguage },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    value: string;
    expires_at: number;
  };

  return {
    clientSecret: data.value,
    expiresAt: data.expires_at,
  };
}
