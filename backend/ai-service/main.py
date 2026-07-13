from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TalentPilot AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY", "placeholder"))
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


@app.post("/extract")
async def extract_resume(request: ResumeRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty")

    prompt = EXTRACTION_PROMPT.format(
        resume_text=request.resume_text[:8000],
        job_description=request.job_description[:2000] if request.job_description else "Not provided"
    )

    try:
        response = model.generate_content(prompt)
        text = clean_json(response.text)
        return json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

    try:
        response = model.generate_content(prompt)
        return json.loads(clean_json(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "OK", "service": "Smart ATS AI"}
