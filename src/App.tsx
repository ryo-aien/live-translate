import { useState, useCallback, useRef, useEffect } from "react";
import { Topbar }           from "./components/CenterBar";
import { Sidebar }          from "./components/HistorySheet";
import { MicDock }          from "./components/ActionBar";
import { LogBubble }        from "./components/ChatBubble";
import { TranslationPane }  from "./components/TalkPanel";
import { Icon }             from "./components/Icon";
import { useRealtimeTranslation } from "./hooks/useRealtimeTranslation";
import { useAutoTranslation }     from "./hooks/useAutoTranslation";
import { useConversationHistory } from "./hooks/useConversationHistory";
import type { Direction, LanguageCode } from "./types/translation";
import { ERROR_MESSAGES, PARTNER_LANGUAGES, LANGUAGE_LABELS } from "./types/translation";
import type { AppErrorCode } from "./types/translation";

type Layout = "facing" | "split" | "stack";

const LANG_INFO: Record<LanguageCode, { flag: string; code: string }> = {
  ja: { flag: "🇯🇵", code: "JA" },
  en: { flag: "🇺🇸", code: "EN" },
  zh: { flag: "🇨🇳", code: "ZH" },
  ko: { flag: "🇰🇷", code: "KO" },
};


export default function App() {
  const [partnerLanguage, setPartnerLanguage] = useState<LanguageCode>("en");
  const [layout, setLayout] = useState<Layout>("split");
  const [dockSpeaker, setDockSpeaker] = useState<"me" | "partner">("me");
  const [autoMode, setAutoMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── manual mode ──
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [manualInput, setManualInput]   = useState("");
  const [manualOutput, setManualOutput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── auto mode ──
  const [meInput,       setMeInput]       = useState("");
  const [meOutput,      setMeOutput]      = useState("");
  const [partnerInput,  setPartnerInput]  = useState("");
  const [partnerOutput, setPartnerOutput] = useState("");

  // ── elapsed timer ──
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const active = activeDirection !== null || autoMode;
    if (!active) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [activeDirection, autoMode]);

  const { history, addItem } = useConversationHistory();
  const logRef = useRef<HTMLDivElement>(null);

  // scroll log to bottom on new content
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [
    history.length,
    manualInput.length, manualOutput.length,
    meInput.length, meOutput.length,
    partnerInput.length, partnerOutput.length,
  ]);

  // ── manual session closed ──
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
    stop:  manualStop,
    audioEnabled,
    toggleAudio,
  } = useRealtimeTranslation({
    onInputTranscript:  useCallback((t: string) => setManualInput(t),  []),
    onOutputTranscript: useCallback((t: string) => setManualOutput(t), []),
    onSessionClosed: handleManualSessionClosed,
    onError: handleManualError,
  });

  const manualIsBusy      = manualState !== "idle" && manualState !== "error";
  const manualIsConnecting = manualState === "connecting";

  const handleManualToggle = useCallback(
    (direction: Direction) => {
      if (activeDirection === direction) { manualStop(); return; }
      if (manualIsBusy) return;
      setActiveDirection(direction);
      setManualInput(""); setManualOutput("");
      setErrorMessage(null);
      void manualStart(direction, direction === "me_to_partner" ? partnerLanguage : "ja");
    },
    [activeDirection, manualIsBusy, partnerLanguage, manualStart, manualStop]
  );

  // ── auto mode ──
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
    stop:  autoStop,
  } = useAutoTranslation({
    onMeInput:       useCallback((t: string) => setMeInput(t),       []),
    onMeOutput:      useCallback((t: string) => setMeOutput(t),      []),
    onPartnerInput:  useCallback((t: string) => setPartnerInput(t),  []),
    onPartnerOutput: useCallback((t: string) => setPartnerOutput(t), []),
    onUtteranceDone: handleAutoUtteranceDone,
    onError: handleAutoError,
  });

  // ── mode toggle ──
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

  // ── swap speaker ──
  const handleSwapSpeaker = useCallback(() => {
    const next: "me" | "partner" = dockSpeaker === "me" ? "partner" : "me";
    setDockSpeaker(next);
    if (!autoMode && manualIsBusy) {
      const newDir: Direction = next === "me" ? "me_to_partner" : "partner_to_me";
      manualStop();
      setManualInput(""); setManualOutput("");
      setErrorMessage(null);
      setActiveDirection(newDir);
      void manualStart(newDir, newDir === "me_to_partner" ? partnerLanguage : "ja");
    }
  }, [dockSpeaker, autoMode, manualIsBusy, manualStop, manualStart, partnerLanguage]);

  // ── dock mic click ──
  const handleMicClick = useCallback(() => {
    if (autoMode) {
      handleToggleAutoMode();
      return;
    }
    if (manualIsBusy) {
      manualStop();
      return;
    }
    const dir: Direction = dockSpeaker === "me" ? "me_to_partner" : "partner_to_me";
    handleManualToggle(dir);
  }, [autoMode, manualIsBusy, dockSpeaker, handleToggleAutoMode, handleManualToggle, manualStop]);

  // ── dock state ──
  const isRecording =
    autoMode
      ? autoState === "listening"
      : activeDirection !== null && !manualIsConnecting;

  const isConnecting =
    autoMode ? autoState === "starting" : manualIsConnecting;

  // ── live bubble data ──
  const liveBubble = autoMode
    ? activeSpeaker === "me" && (meInput || meOutput)
      ? { direction: "me_to_partner" as Direction, src: meInput, tx: meOutput,
          srcLang: "ja" as LanguageCode, txLang: partnerLanguage }
      : activeSpeaker === "partner" && (partnerInput || partnerOutput)
      ? { direction: "partner_to_me" as Direction, src: partnerInput, tx: partnerOutput,
          srcLang: partnerLanguage, txLang: "ja" as LanguageCode }
      : null
    : activeDirection && (manualInput || manualOutput)
    ? {
        direction: activeDirection,
        src: manualInput, tx: manualOutput,
        srcLang: activeDirection === "me_to_partner" ? "ja" as LanguageCode : partnerLanguage,
        txLang:  activeDirection === "me_to_partner" ? partnerLanguage : "ja" as LanguageCode,
      }
    : null;

  // ── pane content ──
  // me_to_partner: 自分=source(JA transcript), 相手側=target(EN translation)
  // partner_to_me: 相手側=source(partner transcript), 自分=target(JA translation)
  const mePane = {
    transcript:  autoMode ? meInput       : (activeDirection === "me_to_partner"  ? manualInput  : ""),
    translation: autoMode ? meOutput      : (activeDirection === "partner_to_me"  ? manualOutput : ""),
    showCaret: autoMode ? activeSpeaker === "me" : activeDirection !== null,
  };
  const partnerPane = {
    transcript:  autoMode ? partnerInput  : (activeDirection === "partner_to_me"  ? manualInput  : ""),
    translation: autoMode ? partnerOutput : (activeDirection === "me_to_partner"  ? manualOutput : ""),
    showCaret: autoMode ? activeSpeaker === "partner" : activeDirection !== null,
  };

  return (
    <div className={`app${sidebarOpen ? " sidebar-open" : ""}`}>
      {/* ── Topbar ── */}
      <Topbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* ── Sidebar ── */}
      <Sidebar items={history} />

      {/* ── Stage ── */}
      <main className="stage">
        {/* Stage header */}
        <div className="stage-hd">
          <div className="lang-pair">
            {PARTNER_LANGUAGES.map((l) => {
              const info = LANG_INFO[l.code as LanguageCode];
              return (
                <button
                  key={l.code}
                  className={`lang-btn${partnerLanguage === l.code ? " on" : ""}`}
                  onClick={() => handleChangePartnerLanguage(l.code as LanguageCode)}
                  disabled={manualIsBusy && !autoMode}
                  type="button"
                >
                  <span className="lp-flag">{info.flag}</span>
                  <span className="lp-code">{info.code}</span>
                  <span className="lp-name">{l.label}</span>
                </button>
              );
            })}
          </div>

          <div className="stage-tabs">
            <button
              className={`tabchip${layout === "split" ? " on" : ""}`}
              onClick={() => setLayout("split")}
              title="横並び"
            >
              横並び
            </button>
            <button
              className={`tabchip${layout === "facing" ? " on" : ""}`}
              onClick={() => setLayout("facing")}
              title="対面表示"
            >
              対面
            </button>
            <button
              className={`tabchip${layout === "stack" ? " on" : ""}`}
              onClick={() => setLayout("stack")}
              title="ログ表示"
            >
              ログ
            </button>

            <span style={{ width: 10 }} />

            <button
              className={`tabchip${audioEnabled ? " on" : ""}`}
              onClick={toggleAudio}
              title="読み上げ"
            >
              <Icon name={audioEnabled ? "speaker" : "speaker-off"} size={13} />
              読み上げ {audioEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Pane area */}
        <div className={`panes ${layout}`}>
          {layout === "stack" ? (
            /* ── Conversation log ── */
            <div className="log" ref={logRef}>
              {history.length === 0 && !liveBubble ? (
                <div className="log-empty">
                  <p>マイクボタンを押して話し始めてください</p>
                </div>
              ) : (
                <>
                  {history.map((item) => (
                    <LogBubble
                      key={item.id}
                      direction={item.direction}
                      sourceText={item.sourceText}
                      translatedText={item.translatedText}
                      sourceLanguage={item.sourceLanguage}
                      targetLanguage={item.targetLanguage}
                    />
                  ))}
                  {liveBubble && (
                    <LogBubble
                      direction={liveBubble.direction}
                      sourceText={liveBubble.src}
                      translatedText={liveBubble.tx}
                      sourceLanguage={liveBubble.srcLang}
                      targetLanguage={liveBubble.txLang}
                      isStreaming
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            /* ── Facing / Split panes ── */
            <>
              <TranslationPane
                who="相手側 (Other)"
                lang={partnerLanguage}
                isSource={autoMode ? activeSpeaker === "partner" : activeDirection === "partner_to_me"}
                transcript={partnerPane.transcript}
                translation={partnerPane.translation}
                showCaret={partnerPane.showCaret}
              />
              <TranslationPane
                who="自分 (You)"
                lang="ja"
                isSource={autoMode ? activeSpeaker !== "partner" : activeDirection !== "partner_to_me"}
                transcript={mePane.transcript}
                translation={mePane.translation}
                showCaret={mePane.showCaret}
              />
            </>
          )}
        </div>

        {/* Mic dock */}
        <MicDock
          recording={isRecording}
          isConnecting={isConnecting}
          onMicClick={handleMicClick}
          elapsed={elapsed}
          speaker={dockSpeaker}
          onSwapSpeaker={handleSwapSpeaker}
          autoDetect={autoMode}
          onToggleAutoDetect={handleToggleAutoMode}
        />

        {/* Stage footer */}
        <div className="stage-ft">
          <div className="stage-ft-group">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="waveform" size={12} />
              モデル: GPT Realtime · gpt-4o-realtime-preview
            </span>
            <span>·</span>
            <span>入力: マイク</span>
          </div>
        </div>

        {/* Error toast */}
        {errorMessage && (
          <div className="floating-error" onClick={() => setErrorMessage(null)}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
