# AI Portfolio

React + TypeScript frontend and FastAPI backend for an AI-powered resume chat.

## Run locally

1. Create `backend/.env` with your Groq API key:

   ```env
   GROQ_API_KEY=your_groq_api_key
   CORS_ORIGINS=http://localhost:5173,http://localhost:5174
   ```

   The backend reads this file directly. Keep the key private; `.env` files are ignored by Git.

2. In a separate terminal, go to the repository root, install Python dependencies, and start the API:
   ```powershell
   cd D:\Projects\AiPortfolio
   uv sync
   uv run uvicorn backend.main:app --reload
   ```

   The API starts at `http://localhost:8000`. It loads `backend/Aryan's resume.pdf` in the background; `GET /` reports `loading`, `ready`, or `error` while keeping health checks responsive. Set `CORS_ORIGINS` to the comma-separated frontend origins when calling the backend directly.

3. In another terminal, install frontend dependencies and start Vite:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the Vite URL shown in the terminal. The frontend's `/api` requests are proxied to the API on port 8000. Set `VITE_API_BASE_URL` when a deployed frontend needs to call a backend URL directly.

## API

- `GET /` — API health and resume loading status.
- `POST /chat` — accepts `{ "question": "..." }` and returns `{ "answer": "..." }`.
- `POST /chat/stream` — accepts the same request and streams answer tokens as server-sent events.
