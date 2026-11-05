# Aryan Duhan's AI Portfolio — Interview Guide

## 30-second explanation

I built a personal portfolio with an AI resume assistant. A recruiter can ask about my education, internship, skills, or projects and see a concise streamed answer grounded in my candidate data. The React/Vite site talks to a FastAPI backend, which calls Groq for answers and returns structured project links that the UI renders as project cards.

## The problem

A regular portfolio makes a recruiter browse multiple sections or open a PDF to find a specific detail. I wanted one place where a recruiter could ask a natural-language question and quickly get a focused answer, while still being able to open the relevant project code or live demo.

## How it works

1. The React and TypeScript frontend is built with Vite. It has a landing page, an inline chat box, and a full chat view.
2. The frontend calls the FastAPI backend. During local development, Vite proxies `/api` to the backend. In production, `VITE_API_BASE_URL` points directly to the deployed backend.
3. At startup, FastAPI loads the curated structured candidate profile from `backend/resume_data.json` and creates the Groq client. Candidate details from `backend/about.md` are added to the prompt.
4. `POST /chat/stream` sends the prompt to Groq and returns server-sent events. The frontend displays each answer token as it arrives.
5. The backend detects which known projects the answer refers to and sends their metadata in a `links` event. The frontend renders live-site and GitHub buttons, plus a concise description, metrics, and stack.
6. `GET /suggestions` supplies starter questions. After an answer, `POST /suggestions` asks the model for relevant follow-ups.
7. `GET /resume` serves the resume PDF inline in the browser.

## Main technologies

- **Frontend:** React, TypeScript, Vite, CSS modules
- **Backend:** Python, FastAPI, Pydantic, Uvicorn
- **AI:** Groq API with `openai/gpt-oss-120b`, low reasoning effort, and streamed responses
- **Deployment:** Netlify for the static frontend; Render for the API

## Problems encountered and how I addressed them

### Frontend could not reach the backend

The frontend and backend run on different local ports and will have different production domains. I added CORS configuration on FastAPI, used Vite's `/api` proxy locally, and made the frontend API base configurable with `VITE_API_BASE_URL` for deployment.

### Chat answers felt slow and blocked the page

Waiting for the complete model response makes a chat feel stalled. The backend now streams answer tokens over server-sent events, and the UI renders them as they arrive. Streaming improves perceived speed, though the model and network still determine when the first token arrives and when the full answer finishes.

### Backend startup depended on an AI request

The earlier startup flow extracted the PDF and called Groq to parse it every time the backend started. That could delay readiness and fail during a provider outage or rate limit. I replaced that startup-time model call with a curated JSON profile loaded locally. The PDF remains available through `/resume`; it is not parsed at runtime.

### Long answers produced cluttered project cards

The model may mention project names in a broad answer such as “Tell me about yourself.” If every name automatically triggered full cards, the UI became noisy. The backend now suppresses cards for general introduction questions and sends project links separately so the frontend can render cards only when relevant.

### Hardcoded suggestions became inconsistent

The homepage and full chat originally showed separate suggestion lists. The homepage now loads starter suggestions from the same backend endpoint used by the chat, and the backend generates follow-ups after each answer.

### Free hosting can sleep

Render's free web service can spin down when idle. The frontend starts a health request on page load so the backend can wake while a recruiter reads the landing page; the UI shows “Connecting…” until the health endpoint responds. The backend loads its profile from local JSON instead of waiting for an LLM call during startup. These measures reduce avoidable delay, but they cannot eliminate Render's wake-up time or guarantee a sub-second AI response.

### Free-tier usage needed a guardrail

The chat API enforces a rolling limit of four requests per hour per client address and returns HTTP 429 with a retry time when the limit is reached. The limit is also displayed beside the homepage and chat inputs. The current counter is in memory, so it resets when the free service restarts; a shared store such as Redis or DynamoDB would be needed for a durable production limit.

## Quality and safety choices

- The candidate prompt instructs the model to answer only from the supplied profile and to say when information is unavailable.
- The prompt asks for short, plain-text answers and prohibits invented project features or URLs in the answer body.
- Project URLs are selected from backend-controlled metadata rather than generated by the model.
- The Groq API key belongs in the Render environment settings, never in frontend code or Git.
- Resume and profile details are intentionally public because the portfolio and `/resume` endpoint expose them to recruiters.

## Free-tier deployment plan

The repository includes deployment configuration for the existing monorepo:

- **Netlify:** base directory `frontend`, build command `npm run build`, publish directory `dist`.
- **Render:** the `render.yaml` blueprint deploys `backend.main:app` on the free plan.
- Set `GROQ_API_KEY` in Render's environment settings.
- Set `CORS_ORIGINS` in Render to the exact Netlify site origin, for example `https://your-site.netlify.app`.
- Set `VITE_API_BASE_URL` in Netlify to the Render service URL, for example `https://ai-portfolio-api.onrender.com`.
- The resume PDF is not ignored by Git, so it can be included in the Render deployment repository.

## Honest trade-offs and next steps

- Free Render may take a while to wake after inactivity. The homepage health request overlaps that wake-up with the visitor's reading time, but an always-on plan is needed for consistent availability.
- The AI answer itself is not guaranteed to complete in under one second. Streaming can show early tokens sooner; a smaller model and short output can reduce latency, but should be quality-checked.
- The in-memory message limit is best-effort on a free single instance. Use shared storage before relying on it as a strict abuse or cost control.
- Follow-up generation makes another model request after a chat answer. If the Groq free quota becomes an issue, use static follow-ups or generate them less often.
- The API key stays on the backend; the browser only calls the portfolio API.

## Interview answer: a challenge I solved

One challenge was making the AI chat feel responsive without letting the model invent details about my work. I streamed the response from FastAPI to the React UI, kept project links in backend-controlled metadata, and grounded the prompt in a curated profile plus project notes. I also removed a Groq call from backend startup by loading structured resume data from JSON. That made startup simpler and more resilient, while keeping the AI call only for the recruiter's actual question.
