import { useState, useEffect } from "react";

type Props = { active: boolean; bars?: number };

export function Waveform({ active, bars = 14 }: Props) {
  const [heights, setHeights] = useState<number[]>(() => Array(bars).fill(20));

  useEffect(() => {
    if (!active) {
      setHeights(Array(bars).fill(18));
      return;
    }
    let raf: number;
    let t = 0;
    const tick = () => {
      t += 1;
      setHeights(
        Array.from({ length: bars }, (_, i) => {
          const base = 35 + Math.sin((t + i * 8) / 6) * 18;
          const noise = Math.random() * 35;
          return Math.max(10, Math.min(95, base + noise));
        })
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, bars]);

  return (
    <div className="wave">
      {heights.map((h, i) => (
        <i key={i} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
