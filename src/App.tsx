import { useState, useCallback } from "react";
import { TalkPanel } from "./components/TalkPanel";
import { CenterBar } from "./components/CenterBar";
import { HistorySheet } from "./components/HistorySheet";
import { useRealtimeTranslation } from "./hooks/useRealtimeTranslation";
import { useAutoTranslation } from "./hooks/useAutoTranslation";
import { useConversationHistory } from "./hooks/useConversationHistory";
import type { Direction, LanguageCode } from "./types/translation";
import { ERROR_MESSAGES } from "./types/translation";
import type { AppErrorCode } from "./types/translation";

export default function App() {
  const [partnerLanguage, setPartnerLanguage] = useState<LanguageCode>("en");
  const [autoMode, setAutoMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Manual mode state ──
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [manualOutput, setManualOutput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Auto mode state ──
  const [meInput, setMeInput] = useState("");
  const [meOutput, setMeOutput] = useState("");
  const [partnerInput, setPartnerInput] = useState("");
  const [partnerOutput, setPartnerOutput] = useState("");

  const { history, addItem } = useConversationHistory();

  // ────────────── Manual mode ──────────────
  const handleManualSessionClosed = useCallback(
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

  const handleManualError = useCallback((code: AppErrorCode) => {
    setErrorMessage(ERROR_MESSAGES[code]);
    setActiveDirection(null);
  }, []);

  const {
    state: manualState,
    start: manualStart,
    stop: manualStop,
    audioEnabled,
    toggleAudio,
  } = useRealtimeTranslation({
    onInputTranscript: useCallback((t: string) => setManualInput(t), []),
    onOutputTranscript: useCallback((t: string) => setManualOutput(t), []),
    onSessionClosed: handleManualSessionClosed,
    onError: handleManualError,
  });

  const manualIsBusy = manualState !== "idle" && manualState !== "error";
  const manualIsStreaming =
    manualState === "recording" || manualState === "playing" || manualState === "ready";

  const handleManualToggle = useCallback(
    (direction: Direction) => {
      if (activeDirection === direction) {
        manualStop();
        return;
      }
      if (manualIsBusy) return;
      setActiveDirection(direction);
      setManualInput("");
      setManualOutput("");
      setErrorMessage(null);
      void manualStart(
        direction,
        direction === "me_to_partner" ? partnerLanguage : "ja"
      );
    },
    [activeDirection, manualIsBusy, partnerLanguage, manualStart, manualStop]
  );

  // ────────────── Auto mode ──────────────
  const handleAutoUtteranceDone = useCallback(
    (speaker: "me" | "partner", inputText: string, outputText: string) => {
      if (!inputText && !outputText) return;
      addItem({
        direction: speaker === "me" ? "me_to_partner" : "partner_to_me",
        sourceLanguage: speaker === "me" ? "ja" : partnerLanguage,
        targetLanguage: speaker === "me" ? partnerLanguage : "ja",
        sourceText: inputText,
        translatedText: outputText,
      });
    },
    [partnerLanguage, addItem]
  );

  const handleAutoError = useCallback((code: AppErrorCode) => {
    setErrorMessage(ERROR_MESSAGES[code]);
  }, []);

  const {
    autoState,
    activeSpeaker,
    start: autoStart,
    stop: autoStop,
  } = useAutoTranslation({
    onMeInput: useCallback((t: string) => setMeInput(t), []),
    onMeOutput: useCallback((t: string) => setMeOutput(t), []),
    onPartnerInput: useCallback((t: string) => setPartnerInput(t), []),
    onPartnerOutput: useCallback((t: string) => setPartnerOutput(t), []),
    onUtteranceDone: handleAutoUtteranceDone,
    onError: handleAutoError,
  });

  // ────────────── Mode toggle ──────────────
  const handleToggleAutoMode = useCallback(() => {
    const next = !autoMode;
    setAutoMode(next);
    if (!next) {
      // switching OFF auto
      autoStop();
      setMeInput("");
      setMeOutput("");
      setPartnerInput("");
      setPartnerOutput("");
      setErrorMessage(null);
    } else {
      // switching ON auto — start immediately
      manualStop();
      setActiveDirection(null);
      setManualInput("");
      setManualOutput("");
      setErrorMessage(null);
      void autoStart(partnerLanguage);
    }
  }, [autoMode, autoStart, autoStop, manualStop, partnerLanguage]);

  // restart auto when partner language changes while auto is on
  const handleChangePartnerLanguage = useCallback(
    (lang: LanguageCode) => {
      setPartnerLanguage(lang);
      if (autoMode) {
        autoStop();
        setMeInput("");
        setMeOutput("");
        setPartnerInput("");
        setPartnerOutput("");
        void autoStart(lang);
      }
    },
    [autoMode, autoStart, autoStop]
  );

  const autoListening = autoState === "listening";
  const autoIsMe = activeSpeaker === "me";
  const autoIsPartner = activeSpeaker === "partner";

  return (
    <div className="app">
      {/* ── 相手エリア（上半分・180°回転） ── */}
      <div className="partner-area">
        <TalkPanel
          role="partner"
          tapLabel="相手が話す"
          directionLabel="相手の言語 → 日本語"
          active={autoMode ? autoIsPartner : (activeDirection === "partner_to_me" && manualState !== "connecting")}
          connecting={autoMode ? autoState === "starting" : (activeDirection === "partner_to_me" && manualState === "connecting")}
          disabled={autoMode ? false : (manualIsBusy && activeDirection !== "partner_to_me")}
          inputText={autoMode ? partnerInput : (activeDirection === "partner_to_me" ? manualInput : "")}
          outputText={autoMode ? partnerOutput : (activeDirection === "partner_to_me" ? manualOutput : "")}
          isStreaming={autoMode ? autoIsPartner : (manualIsStreaming && activeDirection === "partner_to_me")}
          onToggle={autoMode ? () => {} : () => handleManualToggle("partner_to_me")}
          autoMode={autoMode}
          autoListening={autoListening && !autoIsPartner}
        />
      </div>

      {/* ── センターバー ── */}
      <CenterBar
        partnerLanguage={partnerLanguage}
        onChangePartnerLanguage={handleChangePartnerLanguage}
        audioEnabled={audioEnabled}
        onToggleAudio={toggleAudio}
        historyCount={history.length}
        onOpenHistory={() => setShowHistory(true)}
        autoMode={autoMode}
        onToggleAutoMode={handleToggleAutoMode}
        disabled={autoMode ? false : manualIsBusy}
      />

      {/* ── 自分エリア（下半分） ── */}
      <div className="me-area">
        <TalkPanel
          role="me"
          tapLabel="自分が話す"
          directionLabel="日本語 → 相手の言語"
          active={autoMode ? autoIsMe : (activeDirection === "me_to_partner" && manualState !== "connecting")}
          connecting={autoMode ? autoState === "starting" : (activeDirection === "me_to_partner" && manualState === "connecting")}
          disabled={autoMode ? false : (manualIsBusy && activeDirection !== "me_to_partner")}
          inputText={autoMode ? meInput : (activeDirection === "me_to_partner" ? manualInput : "")}
          outputText={autoMode ? meOutput : (activeDirection === "me_to_partner" ? manualOutput : "")}
          isStreaming={autoMode ? autoIsMe : (manualIsStreaming && activeDirection === "me_to_partner")}
          onToggle={autoMode ? () => {} : () => handleManualToggle("me_to_partner")}
          autoMode={autoMode}
          autoListening={autoListening && !autoIsMe}
        />
      </div>

      {/* ── エラー ── */}
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
