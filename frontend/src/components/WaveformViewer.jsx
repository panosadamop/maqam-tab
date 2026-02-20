import { useEffect, useRef } from "react";

export default function WaveformViewer({ buffer, notes }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!buffer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const data = buffer.getChannelData(0);
    const duration = buffer.duration;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#15110a";
    ctx.fillRect(0, 0, W, H);

    // Draw waveform
    const step = Math.ceil(data.length / W);
    ctx.strokeStyle = "rgba(201,169,110,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      const start = x * step;
      let min = 0, max = 0;
      for (let s = 0; s < step; s++) {
        const v = data[start + s] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = (1 - max) / 2 * H;
      const y2 = (1 - min) / 2 * H;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();

    // Draw note markers
    for (const note of notes) {
      const x = (note.time / duration) * W;
      const w = Math.max(2, (note.duration / duration) * W);
      ctx.fillStyle = "rgba(201,169,110,0.2)";
      ctx.fillRect(x, 0, w, H);
      ctx.strokeStyle = "var(--gold)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 2, w, H - 4);
    }

  }, [buffer, notes]);

  return (
    <div className="waveform-viewer">
      <canvas ref={canvasRef} width={1200} height={60} style={{ width: "100%", height: 60, display: "block" }} />
      <style>{`
        .waveform-viewer {
          border-bottom: 1px solid var(--border);
          background: var(--bg2);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
