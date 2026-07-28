from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import json
import logging
import os
import re
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("talentpilot.ai")

app = FastAPI(title="TalentPilot AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY is not set — every extraction request will fail")

genai.configure(api_key=GEMINI_API_KEY or "placeholder")
model = genai.GenerativeModel("gemini-1.5-flash")


class ResumeRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = ""


EXTRACTION_PROMPT = """
You are an expert ATS (Applicant Tracking System). Analyze the resume and return ONLY valid JSON.

Resume Text:
{resume_text}

Job Description:
{job_description}

Return this exact JSON structure (no markdown, no explanation):
{{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "summary": "Professional summary in 2-3 sentences",
  "skills": ["skill1", "skill2"],
  "experience": [
    {{
      "company": "Company Name",
      "title": "Job Title",
      "duration": "Jan 2020 - Dec 2022",
      "description": "Key responsibilities",
      "years": 2
    }}
  ],
  "education": [
    {{
      "institution": "University Name",
      "degree": "Bachelor's",
      "field": "Computer Science",
      "year": "2019",
      "gpa": "3.8"
    }}
  ],
  "certifications": ["cert1"],
  "languages": ["English", "Spanish"],
  "totalExperienceYears": 5,
  "atsScore": 75,
  "matchScore": 80,
  "scoreBreakdown": {{
    "skillsMatch": 85,
    "experienceMatch": 75,
    "educationMatch": 80,
    "keywordsMatch": 70
  }},
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3"],
  "aiSummary": "AI-generated candidate summary and recommendation"
}}

Rules:
- atsScore: 0-100 based on resume quality and formatting
- matchScore: 0-100 based on job description match (0 if no job description)
- Be accurate and extract real data from the resume
"""


def clean_json(text: str) -> str:
    return re.sub(r"```json\s*|\s*```", "", text).strip()


def generate_json(prompt: str, operation: str) -> dict:
    """Call Gemini and parse its JSON reply, mapping every failure to a precise status code."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service is not configured: GEMINI_API_KEY is missing")

    try:
        response = model.generate_content(prompt)
    except Exception as exc:
        logger.exception("%s: Gemini request failed", operation)
        raise HTTPException(status_code=502, detail=f"AI provider request failed: {exc}") from exc

    try:
        text = response.text
    except Exception as exc:
        # Raised when the response was blocked by safety filters or has no candidates.
        logger.error("%s: no usable text in Gemini response: %s", operation, exc)
        raise HTTPException(status_code=502, detail="AI provider returned no usable content") from exc

    try:
        return json.loads(clean_json(text))
    except json.JSONDecodeError as exc:
        logger.error("%s: AI returned invalid JSON: %s", operation, text[:500])
        raise HTTPException(status_code=502, detail="AI returned invalid JSON") from exc


@app.post("/extract")
async def extract_resume(request: ResumeRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty")

    prompt = EXTRACTION_PROMPT.format(
        resume_text=request.resume_text[:8000],
        job_description=request.job_description[:2000] if request.job_description else "Not provided"
    )

    return generate_json(prompt, "extract")


@app.post("/match")
async def match_resume_to_job(request: ResumeRequest):
    if not request.job_description:
        raise HTTPException(status_code=400, detail="Job description required")

    prompt = f"""
Score this resume against the job description. Return ONLY JSON (no markdown):

Resume: {request.resume_text[:5000]}
Job: {request.job_description[:2000]}

{{
  "matchScore": 85,
  "atsScore": 78,
  "scoreBreakdown": {{"skillsMatch": 90, "experienceMatch": 80, "educationMatch": 75, "keywordsMatch": 85}},
  "matchedSkills": ["skill1"],
  "missingSkills": ["skill2"],
  "aiSummary": "Candidate assessment summary"
}}
"""

    return generate_json(prompt, "match")


@app.get("/health")
async def health():
    return {"status": "OK", "service": "Smart ATS AI"}
