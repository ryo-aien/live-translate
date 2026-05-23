import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Topbar }           from "./components/CenterBar";
import { Sidebar }          from "./components/HistorySheet";
import { MicDock }          from "./components/ActionBar";
import { LogBubble }        from "./components/ChatBubble";
import { TranslationPane }  from "./components/TalkPanel";
import type { PaneEntry }   from "./components/TalkPanel";
import { Icon }             from "./components/Icon";
import { useDualTranslation }     from "./hooks/useDualTranslation";
import { useAutoTranslation }     from "./hooks/useAutoTranslation";
import { useConversationHistory, groupBySessions } from "./hooks/useConversationHistory";
import type { Direction, LanguageCode } from "./types/translation";
import { ERROR_MESSAGES, PARTNER_LANGUAGES } from "./types/translation";
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
  const [layout]                   = useState<Layout>("split");
  const [dockSpeaker, setDockSpeaker] = useState<"me" | "partner">("me");
  const [autoMode, setAutoMode]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(() => crypto.randomUUID());
  const currentSessionIdRef = useRef(currentSessionId);

  // ── shared live text state (used by both dual and auto modes) ──
  const [meInput,       setMeInput]       = useState("");
  const [meOutput,      setMeOutput]      = useState("");
  const [partnerInput,  setPartnerInput]  = useState("");
  const [partnerOutput, setPartnerOutput] = useState("");

  const clearLiveText = useCallback(() => {
    setMeInput(""); setMeOutput("");
    setPartnerInput(""); setPartnerOutput("");
  }, []);

  // ── elapsed timer ──
  const [elapsed, setElapsed] = useState(0);

  const { history, addItem, deleteSession } = useConversationHistory();
  const logRef = useRef<HTMLDivElement>(null);

  const handleUtteranceDone = useCallback(
    (speaker: "me" | "partner", inputText: string, outputText: string) => {
      if (!inputText && !outputText) return;
      addItem({
        sessionId: currentSessionIdRef.current,
        direction: speaker === "me" ? "me_to_partner" : "partner_to_me",
        sourceLanguage: speaker === "me" ? "ja" : partnerLanguage,
        targetLanguage: speaker === "me" ? partnerLanguage : "ja",
        sourceText: inputText,
        translatedText: outputText,
      });
    },
    [partnerLanguage, addItem]
  );

  const handleError = useCallback((code: AppErrorCode) => {
    setErrorMessage(ERROR_MESSAGES[code]);
  }, []);

  // ── dual session hook (manual mode) ──
  const {
    state: dualState,
    activeSpeaker: _dualSpeaker,
    audioEnabled,
    toggleAudio,
    start: dualStart,
    stop:  dualStop,
    setSpeaker: dualSetSpeaker,
    stream: dualStream,
  } = useDualTranslation({
    onMeInput:       useCallback((t) => setMeInput(t),       []),
    onMeOutput:      useCallback((t) => setMeOutput(t),      []),
    onPartnerInput:  useCallback((t) => setPartnerInput(t),  []),
    onPartnerOutput: useCallback((t) => setPartnerOutput(t), []),
    onUtteranceDone: handleUtteranceDone,
    onError: handleError,
  });

  // ── auto session hook ──
  const {
    autoState,
    activeSpeaker: autoSpeaker,
    start: autoStart,
    stop:  autoStop,
    stream: autoStream,
  } = useAutoTranslation({
    onMeInput:       useCallback((t) => setMeInput(t),       []),
    onMeOutput:      useCallback((t) => setMeOutput(t),      []),
    onPartnerInput:  useCallback((t) => setPartnerInput(t),  []),
    onPartnerOutput: useCallback((t) => setPartnerOutput(t), []),
    onUtteranceDone: handleUtteranceDone,
    onError: handleError,
  });

  // ── timer ──
  const dualActive = dualState !== "idle";
  useEffect(() => {
    const active = dualActive || autoMode;
    if (!active) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [dualActive, autoMode]);

  // ── scroll log to bottom ──
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, meInput.length, meOutput.length, partnerInput.length, partnerOutput.length]);

  // ── mode: toggle AUTO ──
  const handleToggleAutoMode = useCallback(() => {
    const next = !autoMode;
    setAutoMode(next);
    clearLiveText();
    setErrorMessage(null);
    if (next) {
      dualStop();
      const newAutoId = crypto.randomUUID();
      currentSessionIdRef.current = newAutoId;
      setCurrentSessionId(newAutoId);
      void autoStart(partnerLanguage);
    } else {
      autoStop();
    }
  }, [autoMode, autoStart, autoStop, dualStop, clearLiveText, partnerLanguage]);

  // ── language change (exits AUTO, restarts dual if active) ──
  const handleChangePartnerLanguage = useCallback(
    (lang: LanguageCode) => {
      setPartnerLanguage(lang);
      clearLiveText();
      setErrorMessage(null);
      if (autoMode) {
        autoStop();
        setAutoMode(false);
      } else if (dualActive) {
        dualStop();
      }
    },
    [autoMode, dualActive, autoStop, dualStop, clearLiveText]
  );

  // ── swap speaker ──
  const handleSwapSpeaker = useCallback(() => {
    const next: "me" | "partner" = dockSpeaker === "me" ? "partner" : "me";
    setDockSpeaker(next);
    if (!autoMode && dualState === "ready") {
      dualSetSpeaker(next); // just switches display, no reconnect
    }
  }, [dockSpeaker, autoMode, dualState, dualSetSpeaker]);

  // ── mic button ──
  const handleMicClick = useCallback(() => {
    if (autoMode) { handleToggleAutoMode(); return; }
    if (dualActive) { dualStop(); return; }
    clearLiveText();
    const newId = crypto.randomUUID();
    currentSessionIdRef.current = newId;
    setCurrentSessionId(newId);
    void dualStart(partnerLanguage, dockSpeaker);
  }, [autoMode, dualActive, dualStop, dualStart, clearLiveText, partnerLanguage, dockSpeaker, handleToggleAutoMode]);

  // ── dock state ──
  const isRecording  = autoMode ? autoState === "listening" : dualState === "ready";
  const isConnecting = autoMode ? autoState === "starting"  : dualState === "connecting";
  const activeStream = autoMode ? autoStream : dualStream;

  // ── which speaker is currently active ──
  const effectiveSpeaker = autoMode ? autoSpeaker : (dualState === "ready" ? dockSpeaker : null);

  // ── live bubble (for ログ view) ──
  const liveBubble =
    effectiveSpeaker === "me" && (meInput || meOutput)
      ? { direction: "me_to_partner" as Direction,
          src: meInput, tx: meOutput,
          srcLang: "ja" as LanguageCode, txLang: partnerLanguage }
      : effectiveSpeaker === "partner" && (partnerInput || partnerOutput)
      ? { direction: "partner_to_me" as Direction,
          src: partnerInput, tx: partnerOutput,
          srcLang: partnerLanguage, txLang: "ja" as LanguageCode }
      : null;

  // ── pane content ──
  // meOutput    = my speech translated to partner's language → shown in 相手側 pane
  // partnerOutput = partner's speech translated to Japanese → shown in 自分 pane
  // ── pane entries (committed history + live streaming) ──
  const sessionItems = useMemo(
    () => [...history].filter(i => i.sessionId === currentSessionId).reverse(),
    [history, currentSessionId]
  );

  const meEntries = useMemo<PaneEntry[]>(() => {
    const committed = sessionItems
      .map(item => ({
        label: item.direction === "me_to_partner" ? "自分" : "翻訳",
        text:  item.direction === "me_to_partner" ? item.sourceText : item.translatedText,
      }))
      .filter(entry => entry.text.trim().length > 0);
    const live: PaneEntry[] =
      effectiveSpeaker === "me" && (meInput || meOutput)
        ? [{ label: "自分", text: meInput || "…", isLive: true }]
        : effectiveSpeaker === "partner" && partnerOutput
        ? [{ label: "翻訳", text: partnerOutput, isLive: true }]
        : [];
    return [...committed, ...live];
  }, [sessionItems, effectiveSpeaker, meInput, meOutput, partnerOutput]);

  const partnerEntries = useMemo<PaneEntry[]>(() => {
    const committed = sessionItems
      .map(item => ({
        label: item.direction === "partner_to_me" ? "相手" : "翻訳",
        text:  item.direction === "partner_to_me" ? item.sourceText : item.translatedText,
      }))
      .filter(entry => entry.text.trim().length > 0);
    const live: PaneEntry[] =
      effectiveSpeaker === "partner" && (partnerInput || partnerOutput)
        ? [{ label: "相手", text: partnerInput || "…", isLive: true }]
        : effectiveSpeaker === "me" && meOutput
        ? [{ label: "翻訳", text: meOutput, isLive: true }]
        : [];
    return [...committed, ...live];
  }, [sessionItems, effectiveSpeaker, partnerInput, partnerOutput, meOutput]);

  return (
    <div className={`app${sidebarOpen ? " sidebar-open" : ""}`}>
      {/* ── Topbar ── */}
      <Topbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* ── Sidebar ── */}
      <Sidebar items={history} onDeleteSession={deleteSession} />

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
                  className={`lang-btn${!autoMode && partnerLanguage === l.code ? " on" : ""}`}
                  onClick={() => handleChangePartnerLanguage(l.code as LanguageCode)}
                  disabled={dualActive && !autoMode}
                  type="button"
                >
                  <span className="lp-flag">{info.flag}</span>
                  <span className="lp-code">{info.code}</span>
                  <span className="lp-name">{l.label}</span>
                </button>
              );
            })}
            <button
              className={`lang-btn${autoMode ? " on" : ""}`}
              onClick={handleToggleAutoMode}
              disabled={dualActive && !autoMode}
              type="button"
            >
              <span className="lp-flag"><Icon name="sparkle" size={14} /></span>
              <span className="lp-code">AUTO</span>
              <span className="lp-name">自動</span>
            </button>
          </div>

          <div className="stage-tabs">

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
            <div className="log" ref={logRef}>
              {history.length === 0 && !liveBubble ? (
                <div className="log-empty">
                  <p>マイクボタンを押して話し始めてください</p>
                </div>
              ) : (
                <>
                  {groupBySessions(history).map((sess, si, arr) => (
                    <div key={sess.sessionId} className="log-session">
                      <div className="log-session-hd">
                        <span className="log-session-num">セッション {arr.length - si}</span>
                        <span className="log-session-time">
                          {new Date(sess.startedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {sess.items.map((item) => (
                        <LogBubble
                          key={item.id}
                          direction={item.direction}
                          sourceText={item.sourceText}
                          translatedText={item.translatedText}
                          sourceLanguage={item.sourceLanguage}
                          targetLanguage={item.targetLanguage}
                        />
                      ))}
                    </div>
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
            <>
              <TranslationPane
                who="相手側 (Other)"
                lang={partnerLanguage}
                entries={partnerEntries}
              />
              <TranslationPane
                who="自分 (You)"
                lang="ja"
                entries={meEntries}
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
          stream={activeStream}

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
