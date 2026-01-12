# analysis_service/main.py
import os
from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import tempfile
import json

# parsing / NLP libs
from pyresparser import ResumeParser
from sentence_transformers import SentenceTransformer, util
from transformers import pipeline

app = FastAPI(title="Resume Analysis Service")

# Load or lazy-load heavy models once
EMBED_MODEL_NAME = os.environ.get("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")  # small & fast
SUMMARIZER_MODEL = os.environ.get("SUM_MODEL", "sshleifer/distilbart-cnn-12-6")  # smaller summarizer

print("Loading embedding model:", EMBED_MODEL_NAME)
embed_model = SentenceTransformer(EMBED_MODEL_NAME)

print("Loading summarizer:", SUMMARIZER_MODEL)
summarizer = pipeline("summarization", model=SUMMARIZER_MODEL, device=-1)  # CPU

# baseline skills list (you can expand this)
SKILLS = [
  "javascript","react","node","express","next","typescript","python","java","c++","c","c#",
  "sql","mongodb","postgres","mysql","html","css","tailwind","bootstrap","aws","azure",
  "gcp","docker","kubernetes","git","github","linux","bash","rest","graphql","tensorflow",
  "pytorch","machine learning","data science","nlp","spark","hadoop","django","flask",
  "spring","react native","flutter","android","ios","swift","kotlin","lambda"
]

# Precompute embeddings of skill keywords (lowercase)
skill_emb = embed_model.encode([s.lower() for s in SKILLS], convert_to_tensor=True)

class AnalysisResponse(BaseModel):
    success: bool
    summary: str
    parsed: dict
    keywords: List[str]
    score: int
    strengths: List[str]
    improvements: List[str]

def compute_score(text: str, keywords: List[str], parsed: dict) -> int:
    # Simple, explainable scoring (tweakable)
    score = 50
    if parsed.get("experience"):
        score += 10
    if parsed.get("education"):
        score += 5
    # keyword coverage
    score += min(25, len(keywords) * 3)
    # length bonus
    if len(text) > 1000:
        score += 10
    # penalize very short resumes
    if len(text) < 200:
        score = max(20, score - 20)
    return max(0, min(100, score))

def detect_keywords_semantic(text: str, top_k: int = 10, threshold: float = 0.55):
    text_emb = embed_model.encode(text, convert_to_tensor=True)
    hits = util.semantic_search(text_emb, skill_emb, top_k=len(SKILLS))[0]  # returns list sorted
    found = []
    for hit in hits:
        if hit['score'] >= threshold:
            found.append(SKILLS[hit['corpus_id']])
    return list(dict.fromkeys(found))  # preserve order, unique

@app.post("/analyze-text", response_model=AnalysisResponse)
async def analyze_text(text: str = Form(...)):
    # 1) parse resume structured info using pyresparser's ResumeParser helper (expects file path or dict)
    # pyresparser expects a file; we'll do a lightweight fallback parse by writing temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".txt", mode="w", encoding="utf-8") as f:
        f.write(text)
        tmp_path = f.name

    parsed = {}
    try:
        # ResumeParser generally expects PDF/DOCX; but it can parse text fallback via ResumeParser(tmp_path)
        # We'll call it and catch errors; even if pyresparser fails, we still perform keyword/semantic steps.
        parsed = ResumeParser(tmp_path).get_extracted_data() or {}
    except Exception as e:
        parsed = {"warning": "pyresparser failed - fallback to basic parsing", "error": str(e)}

    # 2) summarization (short summary of resume)
    summary = ""
    try:
        # keep chunks small for summarizer if resume long
        if len(text) > 1600:
            # summarizer on first 1200 chars
            chunk = text[:1600]
        else:
            chunk = text
        s = summarizer(chunk, max_length=120, min_length=30, do_sample=False)
        summary = s[0]['summary_text']
    except Exception as e:
        summary = text[:400]  # fallback: first chars

    # 3) keyword detection: exact matches + semantic hits
    lower = text.lower()
    exact = [s for s in SKILLS if s in lower]
    semantic = detect_keywords_semantic(text)
    # merge and prioritize exact matches
    keywords = list(dict.fromkeys(exact + semantic))

    # 4) compute score and suggestions
    score = compute_score(text, keywords, parsed)
    strengths = []
    improvements = []

    if keywords:
        strengths.append("Relevant skills detected: " + ", ".join(keywords[:8]))
    if parsed.get("total_experience"):
        strengths.append(f"Experience detected: {parsed.get('total_experience')}")
    if parsed.get("education"):
        strengths.append("Education section present")

    if not keywords:
        improvements.append("Add concrete technical skills (e.g., 'React', 'Node.js', 'AWS')")
    if len(text) < 600:
        improvements.append("Expand project descriptions and add measurable outcomes (numbers)")
    improvements.append("Use bullet points under each role and quantify achievements")

    # return structured result
    resp = {
        "success": True,
        "summary": summary,
        "parsed": parsed,
        "keywords": keywords,
        "score": score,
        "strengths": strengths,
        "improvements": improvements
    }

    # cleanup temp file
    try:
        os.unlink(tmp_path)
    except:
        pass

    return resp

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("ANALYSIS_PORT", 8001)), reload=False)
