import { useState } from "react";
import { LanguageSelector } from "./components/LanguageSelector";
import { TalkButton } from "./components/TalkButton";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { ConversationHistory } from "./components/ConversationHistory";
import { useRealtimeTranslation } from "./hooks/useRealtimeTranslation";
import { useConversationHistory } from "./hooks/useConversationHistory";
import { ERROR_MESSAGES } from "./types/translation";
import type { Direction, LanguageCode } from "./types/translation";
import "./App.css";

export default function App() {
  const [partnerLanguage, setPartnerLanguage] = useState<LanguageCode>("en");
  const { history, addItem, clearHistory } = useConversationHistory();

  const { appState, error, transcript, startSession, stopSession } =
    useRealtimeTranslation({ onConversationItem: addItem });

  const handleStart = (direction: Direction) => {
    startSession(direction, partnerLanguage);
  };

  const isIdle = appState === "idle" || appState === "error";

  return (
    <div className="app">
      <header className="app-header">
        <h1>Voice Bridge</h1>
      </header>

      <main className="app-main">
        <LanguageSelector
          value={partnerLanguage}
          onChange={setPartnerLanguage}
          disabled={!isIdle}
        />

        <div className="talk-buttons">
          <TalkButton
            direction="me_to_partner"
            partnerLanguage={partnerLanguage}
            appState={appState}
            onStart={handleStart}
            onStop={stopSession}
          />
          <TalkButton
            direction="partner_to_me"
            partnerLanguage={partnerLanguage}
            appState={appState}
            onStart={handleStart}
            onStop={stopSession}
          />
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {ERROR_MESSAGES[error]}
          </div>
        )}

        {appState !== "idle" && appState !== "error" && (
          <div className="status-badge status-badge--active">
            {appState === "connecting" && "接続中..."}
            {appState === "recording" && "録音中"}
            {appState === "translating" && "翻訳中..."}
            {appState === "playing" && "再生中"}
            {appState === "ready" && "準備完了"}
          </div>
        )}

        <TranscriptPanel
          sourceText={transcript.sourceText}
          translatedText={transcript.translatedText}
        />

        <ConversationHistory history={history} onClear={clearHistory} />
      </main>
    </div>
  );
}
