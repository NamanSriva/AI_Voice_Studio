import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const voices = [
  { name: "Kore", label: "Kore (Female)" },
  { name: "Sasha", label: "Sasha (Female)" },
  { name: "Charon", label: "Charon (Male)" },
  { name: "Fenrir", label: "Fenrir (Male)" },
];

function App() {
  const [prompt, setPrompt] = useState("");
  const [voice, setVoice] = useState("Kore");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setAudioUrl(null);

    const payload = {
      prompt,
      mode: "single",
      voices: [{ voiceName: voice }],
    };

    try {
      const res = await axios.post("/api/tts", payload);
      const audioBase64 = res.data.audio;

      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0))],
        { type: "audio/wav" }
      );
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err) {
      console.error("Frontend error:", err);
      alert("Failed to generate audio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>AI Voice Studio</h2>

      {/* Textarea */}
      <div className="form-row">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type text here (English or Hindi)"
          rows="4"
        />
      </div>

      {/* Voice Selection */}
      <div className="form-row">
        <label>
          Choose voice:
          <select id="vname" value={voice} onChange={(e) => setVoice(e.target.value)}>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Generate Button */}
      <div className="form-row">
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <span className="loading-pulse">Generating...</span>
          ) : (
            "Generate Speech"
          )}
        </button>
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="audio-container">
          <audio controls src={audioUrl}></audio>
          <br />
          <a href={audioUrl} download="output.wav">
            <button>Download Audio</button>
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
