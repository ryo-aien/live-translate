import { Icon } from "./Icon";
import { Waveform } from "./Waveform";

type Props = {
  recording: boolean;
  isConnecting: boolean;
  onMicClick: () => void;
  elapsed: number;
  speaker: "me" | "partner";
  onSwapSpeaker: () => void;
  stream?: MediaStream | null;
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
  stream,
}: Props) {
  return (
    <div className="dock">
      <button className="speaker-switch" onClick={onSwapSpeaker} type="button">
        話者: <b>{speaker === "me" ? "自分" : "相手"}</b>
      </button>

      <Waveform active={recording} stream={stream} />

      <span className="dock-timer">{formatClock(elapsed)}</span>

      <button
        className={[
          "dock-mic",
          recording ? "rec" : "",
          isConnecting ? "connecting" : "",
        ].filter(Boolean).join(" ")}
        onClick={onMicClick}
        title={recording ? "翻訳中 (停止)" : "翻訳開始"}
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
