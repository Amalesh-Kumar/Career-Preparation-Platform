import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// YOUR VALID MODEL (from your model list)
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

app.post("/analyze-resume", async (req, res) => {
  try {
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "Missing pdfBase64" });
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64
              }
            },
            {
              text: `
You are an ATS resume analyzer. Return ONLY valid JSON:

{
  "atsScore": <0-100>,
  "strengths": [...],
  "weaknesses": [...],
  "keySkills": [...],
  "recommendations": [...],
  "sections": {
    "contactInfo": <0-100>,
    "summary": <0-100>,
    "experience": <0-100>,
    "education": <0-100>,
    "skills": <0-100>,
    "formatting": <0-100>
  },
  "keywords": [...],
  "missingElements": [...]
}
`
            }
          ]
        }
      ]
    };

    const response = await fetch(
      `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error("Gemini backend error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () =>
  console.log("Gemini backend running at http://localhost:5000")
);