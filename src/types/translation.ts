export type LanguageCode = "ja" | "en" | "zh" | "ko";

export type Direction = "me_to_partner" | "partner_to_me";

export type AppState =
  | "idle"
  | "connecting"
  | "ready"
  | "recording"
  | "translating"
  | "playing"
  | "error";

export type AppErrorCode =
  | "microphone_permission_denied"
  | "session_create_failed"
  | "webrtc_connection_failed"
  | "translation_failed"
  | "audio_playback_failed"
  | "network_error";

export type ConversationItem = {
  id: string;
  direction: Direction;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  sourceText: string;
  translatedText: string;
  createdAt: string;
};

export const PARTNER_LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  ko: "한국어",
};

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  microphone_permission_denied: "マイク権限が必要です。",
  session_create_failed: "翻訳セッションを開始できませんでした。",
  webrtc_connection_failed: "音声接続に失敗しました。",
  translation_failed: "翻訳に失敗しました。",
  audio_playback_failed: "音声を再生できませんでした。",
  network_error: "ネットワークエラーが発生しました。",
};
