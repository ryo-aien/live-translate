import { useState, useCallback, useRef, useEffect } from "react";
import { ChatBubble } from "./components/ChatBubble";
import { ActionBar } from "./components/ActionBar";
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

  // ── manual mode state ──
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [manualOutput, setManualOutput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── auto mode state ──
  const [meInput, setMeInput] = useState("");
  const [meOutput, setMeOutput] = useState("");
  const [partnerInput, setPartnerInput] = useState("");
  const [partnerOutput, setPartnerOutput] = useState("");

  const { history, addItem } = useConversationHistory();
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // scroll to bottom whenever content grows
  useEffect(() => {
    const el = chatAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [
    history.length,
    manualInput.length,
    manualOutput.length,
    meInput.length,
    meOutput.length,
    partnerInput.length,
    partnerOutput.length,
  ]);

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
  const manualIsConnecting = manualState === "connecting";

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
      autoStop();
      setMeInput(""); setMeOutput("");
      setPartnerInput(""); setPartnerOutput("");
      setErrorMessage(null);
    } else {
      manualStop();
      setActiveDirection(null);
      setManualInput(""); setManualOutput("");
      setErrorMessage(null);
      void autoStart(partnerLanguage);
    }
  }, [autoMode, autoStart, autoStop, manualStop, partnerLanguage]);

  const handleChangePartnerLanguage = useCallback(
    (lang: LanguageCode) => {
      setPartnerLanguage(lang);
      if (autoMode) {
        autoStop();
        setMeInput(""); setMeOutput("");
        setPartnerInput(""); setPartnerOutput("");
        void autoStart(lang);
      }
    },
    [autoMode, autoStart, autoStop]
  );

  // ── live bubble (currently streaming) ──
  const liveBubble = autoMode
    ? activeSpeaker === "me" && (meInput || meOutput)
      ? { direction: "me_to_partner" as Direction, sourceText: meInput, translatedText: meOutput }
      : activeSpeaker === "partner" && (partnerInput || partnerOutput)
      ? { direction: "partner_to_me" as Direction, sourceText: partnerInput, translatedText: partnerOutput }
      : null
    : activeDirection && (manualInput || manualOutput)
    ? { direction: activeDirection, sourceText: manualInput, translatedText: manualOutput }
    : null;

  return (
    <div className="app">
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

      <div className="chat-area" ref={chatAreaRef}>
        <div className="chat-messages">
          {history.length === 0 && !liveBubble && (
            <div className="chat-empty">
              <p className="chat-empty-icon">💬</p>
              <p>話しかけてください</p>
            </div>
          )}
          {history.map((item) => (
            <ChatBubble
              key={item.id}
              direction={item.direction}
              sourceText={item.sourceText}
              translatedText={item.translatedText}
            />
          ))}
          {liveBubble && (
            <ChatBubble
              direction={liveBubble.direction}
              sourceText={liveBubble.sourceText}
              translatedText={liveBubble.translatedText}
              isStreaming
            />
          )}
        </div>
      </div>

      <ActionBar
        autoMode={autoMode}
        activeDirection={activeDirection}
        isConnecting={manualIsConnecting}
        isBusy={manualIsBusy}
        onToggle={handleManualToggle}
        autoState={autoState}
        activeSpeaker={activeSpeaker}
      />

      {errorMessage && (
        <div className="floating-error" onClick={() => setErrorMessage(null)}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {showHistory && (
        <HistorySheet items={history} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
