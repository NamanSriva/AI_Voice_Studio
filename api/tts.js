import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in Vercel Environment Variables!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Convert PCM buffer to WAV buffer
 */
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1) {
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);
  return buffer;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, voice } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Get Gemini TTS model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });

    // Generate audio
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Charon" },
          },
        },
      },
    });

    const audioData =
      result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      return res.status(500).json({ error: "No audio generated" });
    }

    const pcmBuffer = Buffer.from(audioData, "base64");
    const wavBuffer = pcmToWav(pcmBuffer);
    const wavBase64 = wavBuffer.toString("base64");

    res.status(200).json({ audio: wavBase64 });
  } catch (err) {
    console.error("Gemini API call failed:", err);
    // Check for quota/tokens exhausted errors
    if (err.status === 429 || err.message?.includes("quota") || err.message?.includes("exceeded")) {
    return res.status(429).json({
      error: "Free quota exceeded. Please wait a bit or upgrade your plan."
    });
    }
    res.status(500).json({ error: "Gemini API call failed", details: err.message });
  }
}
