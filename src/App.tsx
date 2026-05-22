import { useState, useCallback } from "react";
import { TalkPanel } from "./components/TalkPanel";
import { CenterBar } from "./components/CenterBar";
import { HistorySheet } from "./components/HistorySheet";
import { useRealtimeTranslation } from "./hooks/useRealtimeTranslation";
import { useConversationHistory } from "./hooks/useConversationHistory";
import type { Direction, LanguageCode } from "./types/translation";
import { ERROR_MESSAGES } from "./types/translation";
import type { AppErrorCode } from "./types/translation";

export default function App() {
  const [partnerLanguage, setPartnerLanguage] = useState<LanguageCode>("en");
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [inputTranscript, setInputTranscript] = useState("");
  const [outputTranscript, setOutputTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { history, addItem } = useConversationHistory();

  const handleSessionClosed = useCallback(
    (inputText: string, outputText: string) => {
      if (activeDirection && (inputText || outputText)) {
        addItem({
          direction: activeDirection,
          sourceLanguage: activeDirection === "me_to_partner" ? "ja" : partnerLanguage,
          targetLanguage: activeDirection === "me_to_partner" ? partnerLanguage : "ja",
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
    onInputTranscript: useCallback((t: string) => setInputTranscript(t), []),
    onOutputTranscript: useCallback((t: string) => setOutputTranscript(t), []),
    onSessionClosed: handleSessionClosed,
    onError: handleError,
  });

  const isBusy = state !== "idle" && state !== "error";
  const isStreaming = state === "recording" || state === "playing" || state === "ready";

  const handleToggle = useCallback(
    (direction: Direction) => {
      if (activeDirection === direction) {
        stop();
        return;
      }
      if (isBusy) return;
      setActiveDirection(direction);
      setInputTranscript("");
      setOutputTranscript("");
      setErrorMessage(null);
      void start(direction, direction === "me_to_partner" ? partnerLanguage : "ja");
    },
    [activeDirection, isBusy, partnerLanguage, start, stop]
  );

  const isPartnerActive = activeDirection === "partner_to_me";
  const isMeActive = activeDirection === "me_to_partner";

  return (
    <div className="app">
      {/* ── 相手エリア（上半分・180°回転） ── */}
      <div className="partner-area">
        <TalkPanel
          role="partner"
          tapLabel="相手が話す"
          directionLabel={`相手の言語 → 日本語`}
          active={isPartnerActive && state !== "connecting"}
          connecting={isPartnerActive && state === "connecting"}
          disabled={isBusy && !isPartnerActive}
          inputText={isPartnerActive ? inputTranscript : ""}
          outputText={isPartnerActive ? outputTranscript : ""}
          isStreaming={isStreaming && isPartnerActive}
          onToggle={() => handleToggle("partner_to_me")}
        />
      </div>

      {/* ── センターバー ── */}
      <CenterBar
        partnerLanguage={partnerLanguage}
        onChangePartnerLanguage={setPartnerLanguage}
        audioEnabled={audioEnabled}
        onToggleAudio={toggleAudio}
        historyCount={history.length}
        onOpenHistory={() => setShowHistory(true)}
        disabled={isBusy}
      />

      {/* ── 自分エリア（下半分） ── */}
      <div className="me-area">
        <TalkPanel
          role="me"
          tapLabel="自分が話す"
          directionLabel={`日本語 → 相手の言語`}
          active={isMeActive && state !== "connecting"}
          connecting={isMeActive && state === "connecting"}
          disabled={isBusy && !isMeActive}
          inputText={isMeActive ? inputTranscript : ""}
          outputText={isMeActive ? outputTranscript : ""}
          isStreaming={isStreaming && isMeActive}
          onToggle={() => handleToggle("me_to_partner")}
        />
      </div>

      {/* ── エラー表示 ── */}
      {errorMessage && (
        <div className="floating-error" onClick={() => setErrorMessage(null)}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── 会話履歴シート ── */}
      {showHistory && (
        <HistorySheet items={history} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
