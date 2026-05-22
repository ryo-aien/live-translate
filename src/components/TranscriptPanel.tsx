type Props = {
  sourceText: string;
  translatedText: string;
};

export function TranscriptPanel({ sourceText, translatedText }: Props) {
  return (
    <div className="transcript-panel">
      <div className="transcript-section">
        <div className="transcript-label">原文</div>
        <div className="transcript-text source">
          {sourceText || <span className="placeholder">...</span>}
        </div>
      </div>
      <div className="transcript-section">
        <div className="transcript-label">翻訳</div>
        <div className="transcript-text translated">
          {translatedText || <span className="placeholder">...</span>}
        </div>
      </div>
    </div>
  );
}
