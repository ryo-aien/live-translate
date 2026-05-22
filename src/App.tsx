import { useState, useCallback } from "react";
import { LanguageSelector } from "./components/LanguageSelector";
import { TalkButton } from "./components/TalkButton";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { ConversationHistory } from "./components/ConversationHistory";
import { useRealtimeTranslation } from "./hooks/useRealtimeTranslation";
import { useConversationHistory } from "./hooks/useConversationHistory";
import type { Direction, LanguageCode } from "./types/translation";
import { ERROR_MESSAGES, LANGUAGE_LABELS } from "./types/translation";
import type { AppErrorCode } from "./types/translation";

export default function App() {
  const [partnerLanguage, setPartnerLanguage] = useState<LanguageCode>("en");
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { history, addItem } = useConversationHistory();

  const handleInputTranscript = useCallback((text: string) => {
    setInputTranscript(text);
  }, []);

  const handleOutputTranscript = useCallback((text: string) => {
    setOutputTranscript(text);
  }, []);

  const handleSessionClosed = useCallback(
    (inputText: string, outputText: string) => {
      if (activeDirection && (inputText || outputText)) {
        const sourceLanguage: LanguageCode =
          activeDirection === "me_to_partner" ? "ja" : partnerLanguage;
        const targetLanguage: LanguageCode =
          activeDirection === "me_to_partner" ? partnerLanguage : "ja";
        addItem({
          direction: activeDirection,
          sourceLanguage,
          targetLanguage,
          sourceText: inputText,
          translatedText: outputText,
        });
      }
      setActiveDirection(null);
    },
    [activeDirection, partnerLanguage, addItem]
  );

  const handleError = useCallback((code: AppErrorCode) => {
    setErrorMessage(ERROR_MESSAGES[code]);
    setActiveDirection(null);
  }, []);

  const { state, start, stop, audioEnabled, toggleAudio } = useRealtimeTranslation({
    onInputTranscript: handleInputTranscript,
    onOutputTranscript: handleOutputTranscript,
    onSessionClosed: handleSessionClosed,
    onError: handleError,
  });

  const isBusy = state !== "idle" && state !== "error";

  const handleToggle = useCallback(
    (direction: Direction) => {
      if (activeDirection === direction) {
        // 同じボタンを押したら停止
        stop();
        return;
      }
      if (isBusy) return;
      setActiveDirection(direction);
      setInputTranscript("");
      setOutputTranscript("");
      setErrorMessage(null);
      const target: LanguageCode =
        direction === "me_to_partner" ? partnerLanguage : "ja";
      void start(direction, target);
    },
    [activeDirection, isBusy, partnerLanguage, start, stop]
  );

  const partnerLabel = LANGUAGE_LABELS[partnerLanguage];

  return (
    <div className="app">
      <div className="header">
        <span>Voice Bridge</span>
        <button
          className={`audio-toggle${audioEnabled ? "" : " muted"}`}
          onClick={toggleAudio}
          title={audioEnabled ? "音声オフ" : "音声オン"}
        >
          {audioEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      <LanguageSelector
        value={partnerLanguage}
        onChange={setPartnerLanguage}
        disabled={isBusy}
      />

      <div className="section">
        <TalkButton
          label="自分が話す"
          directionLabel={`日本語 → ${partnerLabel}`}
          variant="me"
          active={activeDirection === "me_to_partner"}
          disabled={isBusy && activeDirection !== "me_to_partner"}
          onToggle={() => handleToggle("me_to_partner")}
        />
      </div>

      <div className="section">
        <TalkButton
          label="相手が話す"
          directionLabel={`${partnerLabel} → 日本語`}
          variant="partner"
          active={activeDirection === "partner_to_me"}
          disabled={isBusy && activeDirection !== "partner_to_me"}
          onToggle={() => handleToggle("partner_to_me")}
        />
      </div>

      {state === "connecting" && (
        <div className="connecting-indicator">接続中…</div>
      )}

      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      <TranscriptPanel
        inputText={inputTranscript}
        outputText={outputTranscript}
      />

      <ConversationHistory items={history} />
    </div>
  );
}
