import { useState, useEffect, useRef } from "react";

type Props = { active: boolean; stream?: MediaStream | null; bars?: number };

export function Waveform({ active, stream, bars = 14 }: Props) {
  const [heights, setHeights] = useState<number[]>(() => Array(bars).fill(18));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !stream) {
      setHeights(Array(bars).fill(18));
      return;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      // use lower ~60% of frequency bins (covers speech range ≈ 0–5 kHz)
      const usable = Math.floor(data.length * 0.6);
      const step = Math.floor(usable / bars);
      setHeights(
        Array.from({ length: bars }, (_, i) => {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j];
          const avg = sum / step / 255;
          return Math.max(10, avg * 82 + 10);
        })
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      ctx.close();
    };
  }, [active, stream, bars]);

  return (
    <div className="wave">
      {heights.map((h, i) => (
        <i key={i} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
