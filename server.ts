import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Murf AI Proxy Endpoint
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceId = "en-US-marcus" } = req.body;
      const apiKey = process.env.MURF_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "MURF_API_KEY is not configured on the server." });
      }

      // Note: Murf AI API might require different parameters based on their latest docs.
      // This is a standard implementation for their TTS generation.
      const response = await axios.post(
        "https://api.murf.ai/v1/speech/generate",
        {
          text,
          voiceId,
          format: "MP3",
          sampleRate: 24000,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("Murf AI Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to generate speech with Murf AI",
        details: error.response?.data || error.message,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
