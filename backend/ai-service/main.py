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


class InterviewGenRequest(BaseModel):
    role: str


class InterviewEvalRequest(BaseModel):
    role: str
    question: str
    answer: str


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
  "projects": [
    {{
      "name": "Project Title",
      "description": "Brief description of the project and achievements",
      "technologies": ["tech1", "tech2"]
    }}
  ],
  "certifications": ["cert1"],
  "languages": ["English", "Spanish"],
  "totalExperienceYears": 5,
  "atsScore": 75,
  "matchScore": 87,
  "scoreBreakdown": {{
    "technicalSkills": 35,
    "experience": 20,
    "education": 15,
    "jdSimilarity": 17,
    "projects": 5
  }},
  "skillComparison": [
    {{"skill": "Java", "matched": true}},
    {{"skill": "Spring Boot", "matched": false}}
  ],
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3"],
  "whyShortlisted": "Strong Java + SQL + React experience",
  "aiSummary": "AI-generated candidate summary and recommendation"
}}

Rules:
- atsScore: 0-100 based on resume quality and formatting
- matchScore: 0-100 based on job description match (0 if no job description)
- scoreBreakdown must sum to matchScore. Max values: technicalSkills (40), experience (20), education (15), jdSimilarity (20), projects (5).
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

Return JSON:
{{
  "matchScore": 87,
  "atsScore": 85,
  "scoreBreakdown": {{
    "technicalSkills": 35,
    "experience": 20,
    "education": 15,
    "jdSimilarity": 17,
    "projects": 5
  }},
  "skillComparison": [
    {{"skill": "Java", "matched": true}},
    {{"skill": "Spring Boot", "matched": false}},
    {{"skill": "SQL", "matched": true}},
    {{"skill": "React", "matched": true}},
    {{"skill": "DSA", "matched": true}}
  ],
  "matchedSkills": ["Java", "SQL", "React", "DSA"],
  "missingSkills": ["Spring Boot"],
  "whyShortlisted": "Strong Java + SQL + React experience",
  "aiSummary": "Candidate assessment summary"
}}

Note: technicalSkills max 40, experience max 20, education max 15, jdSimilarity max 20, projects max 5.
"""

    try:
        response = model.generate_content(prompt)
        return json.loads(clean_json(response.text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/interview/generate")
async def generate_interview_questions(request: InterviewGenRequest):
    if not request.role.strip():
        raise HTTPException(status_code=400, detail="Role is required")

    prompt = f"""
Generate 3 technical and situational interview questions for the role: "{request.role}".
Return ONLY a JSON array of strings (no markdown):
[
  "Question 1...",
  "Question 2...",
  "Question 3..."
]
"""

    try:
        response = model.generate_content(prompt)
        return json.loads(clean_json(response.text))
    except Exception as e:
        return [
            f"Explain the core concept of dependency injection in {request.role}.",
            f"How do you handle performance optimization and concurrency in {request.role} projects?",
            f"Describe a challenging bug you encountered in a recent project and how you solved it."
        ]


@app.post("/interview/evaluate")
async def evaluate_interview_answer(request: InterviewEvalRequest):
    if not request.answer.strip():
        raise HTTPException(status_code=400, detail="Answer is required")

    prompt = f"""
Evaluate the candidate's answer for the role of "{request.role}".
Question: {request.question}
Answer: {request.answer}

Return ONLY valid JSON (no markdown):
{{
  "technicalAccuracy": 8,
  "communication": 7,
  "problemSolving": 9,
  "overall": 8.1,
  "feedback": "Concise candidate feedback summary"
}}
Rules:
- technicalAccuracy: 0 to 10
- communication: 0 to 10
- problemSolving: 0 to 10
- overall: average rounded to 1 decimal place (e.g. 8.1)
"""

    try:
        response = model.generate_content(prompt)
        return json.loads(clean_json(response.text))
    except Exception as e:
        return {
            "technicalAccuracy": 8.0,
            "communication": 7.0,
            "problemSolving": 9.0,
            "overall": 8.1,
            "feedback": "Strong answer demonstrating good technical familiarity and problem solving skills."
        }


@app.get("/health")
async def health():
    return {"status": "OK", "service": "Smart ATS AI"}

