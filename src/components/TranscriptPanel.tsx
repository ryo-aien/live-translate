type Props = {
  inputText: string;
  outputText: string;
};

export function TranscriptPanel({ inputText, outputText }: Props) {
  return (
    <div className="transcript-panel">
      <div className="transcript-block">
        <div className="transcript-block-label">原文</div>
        <div className={`transcript-text${inputText ? "" : " empty"}`}>
          {inputText || "…"}
        </div>
      </div>
      <div className="transcript-block">
        <div className="transcript-block-label">翻訳</div>
        <div className={`transcript-text${outputText ? "" : " empty"}`}>
          {outputText || "…"}
        </div>
      </div>
    </div>
  );
}
