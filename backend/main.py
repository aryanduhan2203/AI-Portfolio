import difflib
import hashlib
import json
import os
import re
import threading
import time
import asyncio
from collections import defaultdict, deque
from collections.abc import Iterator
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from groq import Groq, RateLimitError
from pydantic import BaseModel, Field
from pypdf import PdfReader

load_dotenv(Path(__file__).with_name(".env"))

# ── Groq client ────────────────────────────────────────────────
client: Groq | None = None
MODEL = "openai/gpt-oss-120b"
# gpt-oss is a reasoning model: it "thinks" before the first visible word.
# "low" keeps that wait short; use "medium" only if answers get worse.
REASONING_EFFORT = "low"
# Low temperature = sticks to the data, fewer made-up details.
TEMPERATURE = 0.2

# ── Resume root path ───────────────────────────────────────────
RESUME_PATH = Path(__file__).parent / "Aryan's resume.pdf"
CHAT_LIMIT = 4
CHAT_LIMIT_WINDOW_SECONDS = 60 * 60
_chat_requests: dict[str, deque[float]] = defaultdict(deque)
_chat_requests_lock = threading.Lock()

# ── Pydantic models ────────────────────────────────────────────
class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = Field(default_factory=list)

class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    total_experience_years: float | None = None
    skills: list[str] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)

class Metric(BaseModel):
    label: str
    value: str

class ProjectLink(BaseModel):
    name: str
    url: str
    label: str = "Check code"
    tag: str | None = None
    summary: str | None = None
    note: str | None = None
    live_url: str | None = None
    metrics: list[Metric] = Field(default_factory=list)
    stack: list[str] = Field(default_factory=list)

class ChatResponse(BaseModel):
    answer: str
    links: list[ProjectLink] = Field(default_factory=list)

class SuggestRequest(BaseModel):
    question: str | None = Field(default=None, max_length=4000)
    answer: str | None = Field(default=None, max_length=4000)

class SuggestResponse(BaseModel):
    suggestions: list[str]

# Simple starter chips shown before the first message (no LLM call needed)
INITIAL_SUGGESTIONS = [
    "Tell me about yourself",
    "What's your experience?",
    "What projects have you built?",
    "What are your key skills?",
]

# Used only if the LLM fails while generating follow-ups
FALLBACK_SUGGESTIONS = [
    "What projects have you built?",
    "What's your tech stack?",
    "Tell me about your education",
]

# Projects that get a "Check code" button when the answer mentions them.
# To add one: append a dict here and describe it in about.md.
PROJECTS = [
    {
        "name": "QuickDine",
        "url": "https://github.com/aryanduhan2203/QuickDine",
        "aliases": ["quickdine", "quick dine"],
        "live_url": "http://15.206.36.95",
        "tag": "Full-Stack · Cloud",
        "summary": "Food delivery platform with separate customer, shop-owner and driver logins. Razorpay payments, real-time order tracking, push notifications, and a full AWS deployment with Docker, S3 presigned URLs and an SQS queue with a dead-letter queue.",
        "metrics": [
            {"label": "User roles", "value": "3 logins"},
            {"label": "AWS services", "value": "5+ services"},
            {"label": "Order flow", "value": "5 stages"},
        ],
        "stack": ["Next.js", "React", "TypeScript", "Supabase", "Razorpay", "Docker", "AWS"],
    },
    {
        "name": "Skill Bridge",
        "url": "https://github.com/arpandey1405/skill-bridge",
        "aliases": ["skill bridge", "skillbridge"],
        "tag": "Full-Stack · MERN",
        "note": "I built the backend and MongoDB database; my friend Arpan built the frontend.",
        "summary": "Mentorship and career platform connecting students with alumni mentors: mentorship requests, internship and project opportunities with applications, blog posts and notifications.",
        "metrics": [
            {"label": "User roles", "value": "3 roles"},
            {"label": "Data models", "value": "14 models"},
            {"label": "Auth", "value": "JWT + bcrypt"},
        ],
        "stack": ["Node.js", "Express", "MongoDB", "React", "TypeScript", "Cloudinary", "SendGrid"],
    },
    {
        "name": "Predictive Maintenance",
        "url": "https://github.com/aryanduhan2203/Predictive-Maintenance-for-Military-Equipment",
        "aliases": ["predictive maintenance", "remaining useful life", "cmapss", "c-mapss"],
        "tag": "Machine Learning",
        "summary": "Predicts the remaining useful life of jet engines from sensor data with a Random Forest regressor, including EDA, feature selection and residual diagnostics on the CMAPSS FD001 dataset.",
        "metrics": [
            {"label": "R² score", "value": "0.70"},
            {"label": "MAE", "value": "26.7 cycles"},
            {"label": "Dataset", "value": "100 engines"},
        ],
        "stack": ["Python", "pandas", "scikit-learn", "Matplotlib", "Seaborn"],
    },
    {
        "name": "Project Management Backend",
        "url": "https://github.com/aryanduhan2203/Projevx",
        "aliases": ["project management backend", "project camp", "projevx"],
        "tag": "Backend API",
        "summary": "REST API for collaborative project management with role-based access control, email verification, JWT refresh-token auth, and project and team-member management.",
        "metrics": [
            {"label": "API endpoints", "value": "20 endpoints"},
            {"label": "Access roles", "value": "3 roles"},
            {"label": "Auth", "value": "JWT refresh"},
        ],
        "stack": ["Node.js", "Express", "MongoDB", "JWT", "Nodemailer"],
    },
]

# ── Cached resume (parsed once at startup) ─────────────────────
_resume: Resume | None = None
_resume_status = "loading"
_resume_error: str | None = None

# ── Helpers ────────────────────────────────────────────────────
def read_pdf(file_path: Path) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


ABOUT_PATH = Path(__file__).with_name("about.md")


def load_about() -> str:
    return ABOUT_PATH.read_text(encoding="utf-8") if ABOUT_PATH.exists() else ""


def knowledge(resume: Resume) -> str:
    """Resume data plus about.md (re-read each call, so edits apply without a restart)."""
    text = f"RESUME DATA:\n{resume.model_dump_json(indent=2)}"
    about = load_about()
    if about.strip():
        text += f"\n\nADDITIONAL INFO FROM THE CANDIDATE:\n{about}"
    return text


# ── Spell correction (local, no extra LLM call) ────────────────
_WORD = re.compile(r"[A-Za-z][A-Za-z\-+#]*")
_vocab_cache: dict = {"mtime": None, "has_resume": False, "words": set()}

_BASE_WORDS = {
    "projects", "project", "experience", "internship", "education", "skills",
    "strengths", "weakness", "achievements", "hackathon", "leetcode", "github",
    "resume", "backend", "frontend", "certifications", "technologies", "deployment",
}


def _vocab(resume: Resume | None = None) -> set[str]:
    """Known words: project names/aliases, stack, resume skills, about.md.
    Rebuilt only when about.md changes or the resume finishes loading."""
    mtime = ABOUT_PATH.stat().st_mtime if ABOUT_PATH.exists() else 0
    has_resume = resume is not None
    if _vocab_cache["mtime"] != mtime or _vocab_cache["has_resume"] != has_resume:
        words: set[str] = set(_BASE_WORDS)
        for p in PROJECTS:
            for a in [p["name"], *p["aliases"]]:
                words.update(w.lower() for w in a.split())
            words.update(s.lower() for s in p["stack"])
        words.update(w.lower() for w in _WORD.findall(load_about()) if len(w) >= 4)
        if resume:
            words.update(s.lower() for s in resume.skills)
        _vocab_cache.update(mtime=mtime, has_resume=has_resume, words=words)
    return _vocab_cache["words"]


def correct_spelling(question: str) -> str:
    """Fix likely typos by matching words to known vocabulary (e.g. 'quikdine' -> 'quickdine')."""
    vocab = _vocab(_resume)
    vocab_list = list(vocab)

    def fix(m: re.Match) -> str:
        w = m.group(0)
        lw = w.lower()
        if len(lw) < 5 or lw in vocab:
            return w
        close = difflib.get_close_matches(lw, vocab_list, n=1, cutoff=0.84)
        return close[0] if close else w

    return _WORD.sub(fix, question)


def llm_question(question: str) -> str:
    """Original question, plus the spell-checked version when they differ."""
    fixed = correct_spelling(question)
    if fixed.lower() == question.lower():
        return question
    return f"{question}\n\n[Likely intended question after spell-check: {fixed}]"


# Questions that ask for the whole portfolio ("what projects have you built?").
OVERVIEW_QUESTION = re.compile(
    r"\b(your|his|aryan'?s)\s+(\w+\s+){0,2}projects\b"
    r"|\bprojects\s+(have|has|did|do)\s+(you|aryan)\b"
    r"|\bprojects\s+(that\s+)?(you|aryan)\b"
    r"|\b(list|show)\s+(me\s+)?(all\s+)?(the\s+)?projects\b",
    re.IGNORECASE,
)

# Keep introductory answers focused; project cards are useful when a visitor
# asks about projects, but distracting for a general introduction.
INTRODUCTION_QUESTION = re.compile(
    r"\b(tell\s+me\s+about\s+(yourself|you)|introduce\s+yourself|who\s+are\s+you)\b",
    re.IGNORECASE,
)


def _card(p: dict) -> ProjectLink:
    return ProjectLink(**{k: v for k, v in p.items() if k != "aliases"})


def find_project_links(text: str, question: str = "", limit: int = 4) -> list[ProjectLink]:
    """Cards for the projects the answer names; all of them if the visitor asked
    broadly about "projects" and the answer names none."""
    if INTRODUCTION_QUESTION.search(question):
        return []

    haystack = text.lower()
    named = [
        p for p in PROJECTS
        if any(re.search(rf"\b{re.escape(a)}\b", haystack) for a in p["aliases"])
    ]
    if named:
        return [_card(p) for p in named][:limit]
    if OVERVIEW_QUESTION.search(question):
        return [_card(p) for p in PROJECTS][:limit]
    return []


def enforce_chat_limit(request: Request) -> None:
    """Limit each client address to four chat requests in a rolling hour."""
    client_host = request.client.host if request.client else "unknown"
    # Keep only a one-way identifier in memory rather than retaining raw IPs.
    client_key = hashlib.sha256(client_host.encode("utf-8")).hexdigest()
    now = time.monotonic()
    cutoff = now - CHAT_LIMIT_WINDOW_SECONDS

    with _chat_requests_lock:
        for key, timestamps in list(_chat_requests.items()):
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()
            if not timestamps:
                del _chat_requests[key]

        timestamps = _chat_requests[client_key]
        if len(timestamps) >= CHAT_LIMIT:
            retry_after = max(1, int(timestamps[0] + CHAT_LIMIT_WINDOW_SECONDS - now + 0.999))
            raise HTTPException(
                status_code=429,
                detail="You've reached the limit of 4 messages per hour. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
        timestamps.append(now)


def parse_resume(resume_text: str) -> Resume:
    """Call LLM to extract structured Resume from raw PDF text."""
    if client is None:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    schema = Resume.model_json_schema()
    system_prompt = f"""
You are an expert resume parser.
Extract information from the resume based on its meaning, not only exact section headings.

Different resumes may use different headings:
- Experience / Professional Experience / Work History / Employment / Internships

Skills may appear in the Skills section, work experience, internships, or projects.

Return ONLY valid JSON matching this schema exactly:
{json.dumps(schema, indent=2)}

Rules:
1. Do not invent information.
2. If a value is not available, return null.
3. If a list has no information, return an empty list.
4. Include internships inside experiences.
5. Extract skills mentioned anywhere in the resume.
"""
    user_prompt = f"Parse the following resume:\n\n{resume_text}"

    for attempt in range(5):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                response_format={"type": "json_object"},
            )
            break
        except RateLimitError:
            if attempt == 4:
                raise
            time.sleep(10 * (attempt + 1))

    raw = response.choices[0].message.content
    data = json.loads(raw)
    return Resume(**data)


def candidate_system_prompt(resume: Resume) -> str:
    """Build a concise system prompt grounded in the cached resume."""
    return f"""
You are an AI assistant representing a job candidate named Aryan Duhan.
Below is everything you know about the candidate.

{knowledge(resume)}

RULES:
1. Answer ONLY from the data above. Every fact (names, numbers, dates, tools, results) must
   appear in it. Never guess, infer, round up, or add outside knowledge.
2. The visitor may make spelling mistakes or type in casual shorthand. Interpret the intended
   meaning (e.g. "quikdine" = QuickDine, "skils" = skills). If a spell-checked version is
   provided, use it. If the intent is truly unclear, ask one short clarifying question.
3. If the answer is not in the data, say exactly: "I don't have that information."
   Do not fill gaps. This includes salary, location preferences, notice period, and any
   feature, tool or experience not listed.
4. Respect "not built yet" notes: do not claim direct messaging in Skill Bridge, or
   task/notes endpoints in the Project Management Backend, as working features.
5. Do not claim sole credit for team work (Skill Bridge frontend is Arpan's).
6. Questions unrelated to Aryan: reply "I can only answer questions about Aryan's background and work."
7. Be conversational, professional, first person, 1-3 short sentences.
8. Greetings: a brief greeting and invitation only, no resume summary.
9. One project asked: 2-3 sentence overview (what it is, stack, one standout detail).
   Never write URLs; a project card with a "Check Code" button is shown automatically.
10. Broad "projects" question: ONE short intro sentence only; cards are shown automatically.
11. Plain text only: no markdown, no ** symbols, no bullet lists.
"""


def ask_candidate(question: str, resume: Resume) -> str:
    """Ask a question about the candidate, grounded in the parsed resume."""
    if client is None:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": candidate_system_prompt(resume)},
            {"role": "user",   "content": llm_question(question)},
        ],
        temperature=TEMPERATURE,
        reasoning_effort=REASONING_EFFORT,
    )
    return response.choices[0].message.content or "I couldn't generate an answer. Please try again."


def stream_candidate(question: str, resume: Resume) -> Iterator[str]:
    """Yield answer text chunks from Groq, grounded in the cached resume."""
    start = time.perf_counter()
    if client is None:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": candidate_system_prompt(resume)},
            {"role": "user", "content": llm_question(question)},
        ],
        stream=True,
        temperature=TEMPERATURE,
        reasoning_effort=REASONING_EFFORT,
    )
    first = True
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            if first:
                print(f"[latency] first token after {time.perf_counter() - start:.2f}s")
                first = False
            yield content


def generate_suggestions(resume: Resume, question: str | None = None,
                         answer: str | None = None, n: int = 3) -> list[str]:
    """Ask the LLM for follow-up questions grounded in the resume (and last Q&A)."""
    if client is None:
        return list(FALLBACK_SUGGESTIONS)

    context = ""
    if question:
        context = (
            f"\nThe visitor just asked: {question}\n"
            f"The assistant answered: {answer or ''}\n"
            "Suggest NEW follow-ups that dig deeper. Do not repeat the question above."
        )

    system_prompt = f"""
You write suggested questions for a recruiter chatting with an AI that represents this candidate:

{knowledge(resume)}
{context}

RULES:
1. Write exactly {n} questions, each under 10 words.
2. Each must be answerable from the candidate data above. Never ask about salary,
   remote/hybrid, notice period, location, or anything not in the data.
3. Address the candidate as "you" (the visitor is talking directly to Aryan).
   Prefer specific project names, skills, and companies from the data over generic questions.
4. Return ONLY JSON: {{"suggestions": ["...", "..."]}}
"""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Generate the suggestions."},
            ],
            response_format={"type": "json_object"},
            reasoning_effort=REASONING_EFFORT,
        )
        data = json.loads(response.choices[0].message.content)
        items = [s.strip() for s in data.get("suggestions", []) if isinstance(s, str) and s.strip()]
        return items[:n] or list(FALLBACK_SUGGESTIONS)
    except Exception:
        return list(FALLBACK_SUGGESTIONS)


# ── Lifespan: parse resume once at startup ─────────────────────
async def initialize_resume() -> None:
    global _resume, client, _resume_status, _resume_error
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is missing. Add it to backend/.env.")
        client = Groq(api_key=api_key)
        resume_text = read_pdf(RESUME_PATH)
        if not resume_text.strip():
            raise RuntimeError("The resume PDF contains no extractable text.")
        _resume = await asyncio.to_thread(parse_resume, resume_text)
        _resume_status = "ready"
        print(f"Resume cached — name: {_resume.name}, skills: {len(_resume.skills)}")
    except Exception as e:
        _resume_status = "error"
        _resume_error = str(e)
        print(f"Resume initialization failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(initialize_resume())
    yield
    task.cancel()
    print("Shutting down")


# ── FastAPI app ────────────────────────────────────────────────
app = FastAPI(title="Aryan Duhan — AI Resume API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174",
    ).split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ─────────────────────────────────────────────────────
@app.get("/")
def health():
    return {
        "status": "ok" if _resume_status == "ready" else _resume_status,
        "resume_loaded": _resume is not None,
        "candidate": _resume.name if _resume else None,
    }


@app.get("/resume")
def resume_file():
    if not RESUME_PATH.is_file():
        raise HTTPException(status_code=404, detail="Resume PDF not found.")
    return FileResponse(
        RESUME_PATH,
        media_type="application/pdf",
        filename="Aryan-Duhan-Resume.pdf",
        content_disposition_type="inline",
    )


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, request: Request) -> ChatResponse:
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty.")

    if _resume is None:
        detail = "Resume is still loading. Please try again shortly." if _resume_status == "loading" else "The assistant is unavailable because resume setup failed. Check the backend configuration and logs."
        raise HTTPException(status_code=503, detail=detail)

    enforce_chat_limit(request)

    try:
        answer = ask_candidate(body.question, _resume)
        return ChatResponse(
            answer=answer,
            links=find_project_links(answer, correct_spelling(body.question)),
        )
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit reached. Please wait a moment and try again.")
    except Exception:
        raise HTTPException(status_code=502, detail="The AI service could not answer right now. Please try again.")


@app.post("/chat/stream")
def chat_stream(body: ChatRequest, request: Request):
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be empty.")
    if _resume is None:
        detail = "Resume is still loading. Please try again shortly." if _resume_status == "loading" else "The assistant is unavailable because resume setup failed. Check the backend configuration and logs."
        raise HTTPException(status_code=503, detail=detail)

    enforce_chat_limit(request)

    resume = _resume

    def events() -> Iterator[str]:
        try:
            parts: list[str] = []
            for token in stream_candidate(question, resume):
                parts.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
            links = find_project_links("".join(parts), correct_spelling(question))
            if links:
                payload = {"links": [link.model_dump() for link in links]}
                yield f"event: links\ndata: {json.dumps(payload)}\n\n"
            yield "data: [DONE]\n\n"
        except RateLimitError:
            yield f"event: error\ndata: {json.dumps({'detail': 'AI rate limit reached. Please wait a moment and try again.'})}\n\n"
        except Exception:
            yield f"event: error\ndata: {json.dumps({'detail': 'The AI service could not finish the response. Please try again.'})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/suggestions", response_model=SuggestResponse)
def get_suggestions() -> SuggestResponse:
    return SuggestResponse(suggestions=INITIAL_SUGGESTIONS)


@app.post("/suggestions", response_model=SuggestResponse)
def post_suggestions(request: SuggestRequest) -> SuggestResponse:
    if _resume is None:
        raise HTTPException(status_code=503, detail="Resume is still loading.")
    return SuggestResponse(
        suggestions=generate_suggestions(_resume, request.question, request.answer)
    )
