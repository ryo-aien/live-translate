type Props = {
  role: "me" | "partner";
  tapLabel: string;
  directionLabel: string;
  active: boolean;
  connecting: boolean;
  disabled: boolean;
  inputText: string;
  outputText: string;
  isStreaming: boolean;
  onToggle: () => void;
  // auto mode
  autoMode?: boolean;
  autoListening?: boolean;
};

export function TalkPanel({
  role,
  tapLabel,
  directionLabel,
  active,
  connecting,
  disabled,
  inputText,
  outputText,
  isStreaming,
  onToggle,
  autoMode = false,
  autoListening = false,
}: Props) {
  const cls = [
    "talk-panel",
    role,
    active ? "active" : "",
    connecting ? "connecting" : "",
    disabled ? "disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      onClick={disabled ? undefined : onToggle}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) onToggle();
      }}
      aria-label={active ? "タップして停止" : tapLabel}
    >
      {/* pulse overlay when active */}
      {(active || connecting) && <div className="panel-pulse" />}

      {connecting ? (
        <div className="panel-center">
          <div className="panel-spinner" />
          <p className="panel-status">接続中…</p>
          <p className="panel-direction">{directionLabel}</p>
        </div>
      ) : active && (inputText || outputText) ? (
        <div className="panel-transcript">
          <p className="panel-source">
            {inputText}
            {isStreaming && inputText && <span className="cur" />}
          </p>
          <div className="panel-hr" />
          <p className="panel-translated">
            {outputText}
            {isStreaming && outputText && <span className="cur translated-cur" />}
          </p>
          <div className="panel-stop-hint">
            <span className="rec-dot" />
            タップして停止
          </div>
        </div>
      ) : active ? (
        <div className="panel-center">
          <div className="mic-wave">
            <span /><span /><span /><span /><span />
          </div>
          <p className="panel-status">聞いています…</p>
          <p className="panel-direction">{directionLabel}</p>
          <div className="panel-stop-hint">
            <span className="rec-dot" />
            タップして停止
          </div>
        </div>
      ) : autoMode && autoListening ? (
        // Auto mode: waiting for speech
        <div className="panel-center">
          <div className="panel-auto-idle">
            <span /><span /><span />
          </div>
          <p className="panel-status" style={{ opacity: 0.55, fontSize: 14 }}>待機中</p>
          <p className="panel-direction">{directionLabel}</p>
        </div>
      ) : (
        <div className="panel-center">
          <div className="panel-mic">🎤</div>
          <p className="panel-tap">{tapLabel}</p>
          <p className="panel-direction">{directionLabel}</p>
        </div>
      )}
    </div>
  );
}
