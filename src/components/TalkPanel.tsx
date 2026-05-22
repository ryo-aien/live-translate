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
    autoMode && autoListening && !active ? "auto-standby" : "",
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
      {connecting ? (
        <div className="p-connecting">
          <div className="p-spinner" />
          <p className="p-conn-label">接続中…</p>
          <p className="p-conn-dir">{directionLabel}</p>
        </div>
      ) : active && (inputText || outputText) ? (
        <div className="p-transcript">
          <p className="p-translated">
            {outputText}
            {isStreaming && outputText && <span className="cur" />}
          </p>
          <div className="p-sep" />
          <p className="p-source">
            {inputText}
            {isStreaming && inputText && <span className="cur" />}
          </p>
          <div className="p-stop">
            <span className="rec-dot" />
            タップして停止
          </div>
        </div>
      ) : active ? (
        <div className="p-listening">
          <div className="wave">
            <span /><span /><span /><span /><span />
          </div>
          <p className="p-listening-label">聞いています…</p>
          <p className="p-listening-dir">{directionLabel}</p>
          <div className="p-stop">
            <span className="rec-dot" />
            タップして停止
          </div>
        </div>
      ) : autoMode && autoListening ? (
        <div className="p-standby">
          <div className="p-standby-wave">
            <span /><span /><span />
          </div>
          <p className="p-standby-label">待機中</p>
          <p className="p-conn-dir">{directionLabel}</p>
        </div>
      ) : (
        <div className="p-idle">
          <div className="p-idle-icon">🎤</div>
          <p className="p-idle-label">{tapLabel}</p>
          <p className="p-idle-dir">{directionLabel}</p>
        </div>
      )}
    </div>
  );
}
