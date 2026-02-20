import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { detectMaqam, quantizeNotes, detectOnsets, detectPitch } from "../utils/maqamDetection";
import { findBestPosition, freqToMidi } from "../utils/instruments";

const AudioEngine = forwardRef(function AudioEngine(
  { instrument, tuning, tempo, quantization, onAudioAnalyzed, onRecordingChange, onAnalyzingChange, onAudioBuffer },
  ref
) {
  const [status, setStatus] = useState("idle"); // idle | recording | processing | done
  const [progress, setProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveData, setWaveData] = useState([]);
  const [fileMode, setFileMode] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyzerRef = useRef(null);
  const animFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getStatus: () => status,
  }));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Analyzer for waveform visualization
      const analyzer = audioContextRef.current.createAnalyser();
      analyzer.fftSize = 2048;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => processRecording(stream);

      recorder.start(100);
      mediaRecorderRef.current = recorder;

      setStatus("recording");
      onRecordingChange(true);

      let t = 0;
      timerRef.current = setInterval(() => {
        t += 0.1;
        setRecordingTime(t);
      }, 100);

      // Waveform animation
      drawWaveform();

    } catch (err) {
      alert("Δεν βρέθηκε μικρόφωνο: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    setStatus("processing");
    onRecordingChange(false);
  };

  const drawWaveform = () => {
    if (!analyzerRef.current) return;
    const data = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteTimeDomainData(data);
    const wavePoints = Array.from(data).filter((_, i) => i % 4 === 0).map(v => (v - 128) / 128);
    setWaveData(wavePoints);
    animFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  const processRecording = async (stream) => {
    setStatus("processing");
    onAnalyzingChange(true);

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    await analyzeAudio(blob);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("processing");
    onAnalyzingChange(true);
    await analyzeAudio(file);
  };

  const analyzeAudio = async (blob) => {
    try {
      const ctx = new AudioContext({ sampleRate: 44100 });
      const arrayBuf = await blob.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);

      onAudioBuffer(audioBuf);
      setProgress(20);

      const channelData = audioBuf.getChannelData(0);
      const sampleRate = audioBuf.sampleRate;
      const frameSize = 2048;
      const hopSize = 512;

      // Detect onsets
      const onsets = detectOnsets(channelData, sampleRate);
      setProgress(40);

      // For each onset, detect pitch
      const rawNotes = [];
      for (let i = 0; i < onsets.length; i++) {
        const startSample = Math.floor(onsets[i] * sampleRate);
        const endSample = i + 1 < onsets.length
          ? Math.floor(onsets[i + 1] * sampleRate)
          : Math.min(startSample + frameSize * 4, channelData.length);

        const frame = channelData.slice(startSample, startSample + frameSize);
        if (frame.length < frameSize) continue;

        const freq = detectPitch(frame, sampleRate);
        if (!freq || freq < 50 || freq > 2000) continue;

        const midiFloat = freqToMidi(freq);
        const duration = (endSample - startSample) / sampleRate;

        // Find best position on instrument
        const position = findBestPosition(midiFloat, tuning, instrument);
        if (!position) continue;

        rawNotes.push({
          id: `note_${i}`,
          time: onsets[i],
          duration: Math.max(0.05, duration * 0.9),
          frequency: freq,
          midi: midiFloat,
          midiRounded: Math.round(midiFloat),
          microtonalOffset: (midiFloat - Math.round(midiFloat)) * 100, // cents
          string: position.string,
          fret: position.fret,
          centsOff: position.centsOff,
          ornament: null,
          velocity: calculateVelocity(frame),
        });
      }

      setProgress(60);

      // Quantize
      const quantized = quantizeNotes(rawNotes, tempo, quantization);
      setProgress(75);

      // Detect maqam with seyir analysis
      const maqamResult = detectMaqam(quantized);
      setProgress(90);

      const seyirPath = maqamResult ? maqamResult.seyirPath || [] : [];

      setProgress(100);
      setStatus("done");
      onAnalyzingChange(false);
      onAudioAnalyzed(quantized, maqamResult, seyirPath);

    } catch (err) {
      console.error("Audio analysis error:", err);
      setStatus("error");
      onAnalyzingChange(false);
    }
  };

  const calculateVelocity = (frame) => {
    const rms = Math.sqrt(frame.reduce((s, v) => s + v * v, 0) / frame.length);
    return Math.min(127, Math.round(rms * 2000));
  };

  return (
    <div className="audio-engine">
      <div className="ae-header">
        <div className="ae-title">Ηχογράφηση & Μεταγραφή</div>
        <div className="ae-mode-toggle">
          <button
            className={`mode-btn ${!fileMode ? "active" : ""}`}
            onClick={() => setFileMode(false)}
          >🎙 Live</button>
          <button
            className={`mode-btn ${fileMode ? "active" : ""}`}
            onClick={() => setFileMode(true)}
          >📁 Αρχείο</button>
        </div>
      </div>

      {/* Waveform display */}
      <div className="waveform-container">
        <svg width="100%" height="80" className="waveform-svg">
          {waveData.length > 0 && waveData.map((v, i) => (
            <rect
              key={i}
              x={`${(i / waveData.length) * 100}%`}
              y={`${50 - v * 35}%`}
              width={`${100 / waveData.length + 0.5}%`}
              height={`${Math.abs(v) * 70}%`}
              fill={status === "recording" ? "var(--accent2)" : "var(--gold)"}
              opacity="0.7"
            />
          ))}
          {waveData.length === 0 && (
            <line x1="0" y1="50%" x2="100%" y2="50%"
              stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          )}
        </svg>
      </div>

      <div className="ae-controls">
        {!fileMode ? (
          <>
            {status === "idle" || status === "done" ? (
              <button className="rec-btn" onClick={startRecording}>
                <span className="rec-dot" />
                Εγγραφή
              </button>
            ) : status === "recording" ? (
              <button className="stop-btn" onClick={stopRecording}>
                ⬛ Διακοπή ({recordingTime.toFixed(1)}s)
              </button>
            ) : null}
          </>
        ) : (
          <label className="upload-btn">
            📂 Επιλογή αρχείου ήχου
            <input type="file" accept="audio/*" onChange={handleFileUpload} hidden />
          </label>
        )}
      </div>

      {status === "processing" && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="spinner" />
            <div className="processing-label">Ανάλυση ήχου…</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-steps">
              {progress < 40 && "🎵 Εντοπισμός onsets…"}
              {progress >= 40 && progress < 60 && "🎼 Ανίχνευση τόνων (YIN)…"}
              {progress >= 60 && progress < 75 && "📏 Κβαντισμός ρυθμού…"}
              {progress >= 75 && progress < 90 && "🧠 Ανάλυση μακάμ (seyir)…"}
              {progress >= 90 && "✅ Ολοκλήρωση…"}
            </div>
          </div>
        </div>
      )}

      <div className="ae-tips">
        <div className="tip-title">💡 Οδηγίες</div>
        <ul>
          <li>Παίξε με καθαρό και σαφή τόνο χωρίς πολύ reverb</li>
          <li>Βεβαιώσου ότι το όργανο είναι καλά κουρδισμένο πριν ηχογραφήσεις</li>
          <li>Παίξε κάθε νότα ξεχωριστά για καλύτερη ανίχνευση</li>
          <li>Ρύθμισε το tempo πριν αναλύσεις για ακριβέστερο κβαντισμό</li>
        </ul>
      </div>

      <style>{`
        .audio-engine {
          padding: 32px;
          max-width: 700px;
          margin: 0 auto;
          position: relative;
        }
        .ae-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px;
        }
        .ae-title {
          font-family: var(--font-serif);
          font-size: 22px; color: var(--gold2);
        }
        .ae-mode-toggle { display: flex; gap: 4px; }
        .mode-btn {
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text2); padding: 6px 14px;
          border-radius: var(--radius); cursor: pointer;
          font-family: var(--font-mono); font-size: 12px;
          transition: all .2s;
        }
        .mode-btn.active {
          background: var(--bg4); color: var(--gold);
          border-color: rgba(201,169,110,0.4);
        }
        .waveform-container {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 24px;
          overflow: hidden;
          height: 80px;
        }
        .waveform-svg { display: block; }
        .ae-controls { display: flex; gap: 12px; margin-bottom: 32px; }
        .rec-btn, .stop-btn, .upload-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 28px;
          border: none; border-radius: var(--radius);
          font-family: var(--font-mono); font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .2s;
        }
        .rec-btn {
          background: var(--accent); color: var(--cream);
        }
        .rec-btn:hover { background: var(--accent2); transform: scale(1.02); }
        .rec-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #ff4444;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .stop-btn {
          background: var(--bg4); color: var(--text);
          border: 1px solid var(--border);
        }
        .upload-btn {
          background: var(--bg3); color: var(--gold);
          border: 1px solid rgba(201,169,110,0.3);
        }
        .upload-btn:hover { background: var(--bg4); }
        .processing-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .processing-content {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 40px; text-align: center;
          min-width: 300px;
        }
        .spinner {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid var(--bg4);
          border-top-color: var(--gold);
          animation: spin .8s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .processing-label { color: var(--gold2); font-size: 14px; margin-bottom: 16px; }
        .progress-bar {
          background: var(--bg3); border-radius: 4px; height: 6px; overflow: hidden;
        }
        .progress-fill {
          height: 100%; background: var(--gold);
          transition: width .3s ease;
          border-radius: 4px;
        }
        .progress-steps { font-size: 11px; color: var(--text2); margin-top: 12px; }
        .ae-tips {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 16px;
        }
        .tip-title { font-size: 11px; color: var(--gold); margin-bottom: 8px; }
        .ae-tips ul { list-style: none; padding: 0; }
        .ae-tips li {
          font-size: 11px; color: var(--text2);
          padding: 3px 0; padding-left: 14px;
          position: relative;
        }
        .ae-tips li::before {
          content: "·"; position: absolute; left: 0; color: var(--gold);
        }
      `}</style>
    </div>
  );
});

export default AudioEngine;
