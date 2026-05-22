type Props = {
  inputText: string;
  outputText: string;
  isStreaming: boolean;
};

export function TranscriptPanel({ inputText, outputText, isStreaming }: Props) {
  return (
    <>
      <div>
        <div className="transcript-label">原文</div>
        <div className={`transcript-text${inputText ? "" : " empty"}`}>
          {inputText || "…"}
          {isStreaming && inputText && <span className="stream-cursor" />}
        </div>
      </div>
      <div className="transcript-divider" />
      <div>
        <div className="transcript-label">翻訳</div>
        <div className={`transcript-text${outputText ? "" : " empty"}`}>
          {outputText || "…"}
          {isStreaming && outputText && (
            <span className="stream-cursor" style={{ background: "var(--partner)" }} />
          )}
        </div>
      </div>
    </>
  );
}
