import { useEffect, useRef } from "react";
import { Box, Paper } from "@mui/material";

export default function WaveformViewer({ buffer, notes }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!buffer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    // Background
    ctx.fillStyle = "#0d0a05";
    ctx.fillRect(0, 0, width, height);

    // Waveform
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    ctx.strokeStyle = "rgba(201,169,110,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const start = x * step;
      let min = 1, max = -1;
      for (let s = start; s < start + step && s < data.length; s++) {
        if (data[s] < min) min = data[s];
        if (data[s] > max) max = data[s];
      }
      ctx.moveTo(x, ((1 + min) / 2) * height);
      ctx.lineTo(x, ((1 + max) / 2) * height);
    }
    ctx.stroke();

    // Note markers
    const duration = buffer.duration;
    notes.forEach(note => {
      const x = (note.time / duration) * width;
      ctx.fillStyle = "rgba(201,169,110,0.7)";
      ctx.fillRect(x, 0, 2, height);
    });
  }, [buffer, notes]);

  return (
    <Paper
      variant="outlined"
      sx={{ borderColor: "divider", bgcolor: "background.paper", flexShrink: 0, overflow: "hidden" }}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={60}
        style={{ width: "100%", height: 60, display: "block" }}
      />
    </Paper>
  );
}
