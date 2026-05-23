import { Icon } from "./Icon";
import { Waveform } from "./Waveform";

type Props = {
  recording: boolean;
  isConnecting: boolean;
  onMicClick: () => void;
  elapsed: number;
  speaker: "me" | "partner";
  onSwapSpeaker: () => void;
  autoDetect: boolean;
  onToggleAutoDetect: () => void;
  disabled?: boolean;
};

function formatClock(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function MicDock({
  recording,
  isConnecting,
  onMicClick,
  elapsed,
  speaker,
  onSwapSpeaker,
  autoDetect,
  onToggleAutoDetect,
}: Props) {
  return (
    <div className="dock">
      <button
        className={`iconbtn${autoDetect ? " active" : ""}`}
        title="話者自動判定"
        onClick={onToggleAutoDetect}
      >
        <Icon name="sparkle" size={16} />
      </button>

      <div className="dock-divider" />

      <button className="speaker-switch" onClick={onSwapSpeaker} type="button">
        話者: <b>{speaker === "me" ? "自分" : "相手"}</b>
      </button>

      <Waveform active={recording} />

      <span className="dock-timer">{formatClock(elapsed)}</span>

      <button
        className={[
          "dock-mic",
          recording ? "rec" : "",
          isConnecting ? "connecting" : "",
        ].filter(Boolean).join(" ")}
        onClick={onMicClick}
        title={recording ? "停止" : "録音開始"}
        type="button"
      >
        {isConnecting ? (
          <div className="p-spinner" />
        ) : (
          <Icon name={recording ? "stop" : "mic"} size={22} color="currentColor" />
        )}
      </button>
    </div>
  );
}
