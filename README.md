# Smart ATS & Recruiter Dashboard

An AI-powered Applicant Tracking System for recruiters to manage the full hiring pipeline — from bulk resume upload to interview scheduling.

---

## Features

| Feature | Details |
|---|---|
| Bulk Resume Upload | Upload up to 100 PDF/DOC/DOCX resumes at once |
| AI Extraction | Gemini AI extracts skills, experience, education, certifications |
| ATS Scoring | Each resume scored 0–100 against job description |
| Candidate Ranking | Candidates ranked by match score per job |
| Duplicate Detection | SHA-256 hash-based duplicate resume blocking |
| Analytics Dashboard | Score distribution, hiring funnel, top skills charts |
| Interview Scheduling | Schedule with type/round, auto email notification to candidate |
| Interview Feedback | Rating, technical/communication/culture scores, recommendation |
| Candidate Profiles | Full profile with experience timeline, notes, application history |
| JWT Auth | Role-based access: recruiter, hiring_manager, admin |

---

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Chart.js, React Dropzone
- **Backend**: Node.js, Express, MongoDB, Mongoose, JWT
- **AI Service**: Python FastAPI, Google Gemini 1.5 Flash
- **File Parsing**: pdf-parse, mammoth (DOCX)
- **Email**: Nodemailer (SMTP)
- **DevOps**: Docker, Docker Compose, Nginx

---

## Project Structure

```
smart-ats/
├── backend/
│   ├── server.js              # Express entry point
│   ├── config/db.js           # MongoDB connection
│   ├── models/                # User, Job, Resume, Candidate, Interview
│   ├── routes/                # auth, jobs, resumes, candidates, interviews, analytics
│   ├── middleware/            # JWT auth, multer upload
│   ├── ai-service/            # Python FastAPI AI microservice
│   │   ├── main.py
│   │   └── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, Jobs, ResumeUpload, Candidates, Interviews, Analytics
│   │   ├── components/        # Layout, Sidebar
│   │   ├── context/           # AuthContext
│   │   └── utils/api.js       # Axios API client
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## Quick Start

### 1. Clone & Configure

```bash
git clone <repo-url>
cd smart-ats
```

Create `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smart-ats
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
GEMINI_API_KEY=your_gemini_api_key
AI_SERVICE_URL=http://localhost:8000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:3000
```

### 2. Run with Docker (Recommended)

```bash
docker-compose up --build
```

App available at: `http://localhost:3000`

### 3. Run Locally

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**AI Service:**
```bash
cd backend/ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register recruiter |
| POST | `/api/auth/login` | Login |
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create job |
| POST | `/api/resumes/upload` | Bulk upload resumes |
| GET | `/api/resumes/job/:id` | Get ranked candidates for job |
| PATCH | `/api/resumes/:id/status` | Update candidate status |
| GET | `/api/candidates` | List all candidates |
| POST | `/api/interviews` | Schedule interview |
| POST | `/api/interviews/:id/feedback` | Submit interview feedback |
| GET | `/api/analytics/dashboard` | Dashboard metrics |

---

## AI Service Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/extract` | Extract resume data + score against job |
| POST | `/match` | Re-score resume against new job |
| GET | `/health` | Health check |

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (get from [Google AI Studio](https://aistudio.google.com)) |
| `JWT_SECRET` | Strong random string for JWT signing |
| `MONGO_URI` | MongoDB connection string |
| `EMAIL_USER/PASS` | Gmail credentials for interview notifications |
