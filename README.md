# AIVOA Deviation Intake Module

An AI-powered "Log Deviation" workflow for an API pharmaceutical manufacturer:

**Deviation text/document → AI extraction (LangGraph + Groq) → auto-filled form → AI impact/severity recommendation → user review/edit → save to database.**

See `DECISIONS.md` for the full reasoning behind every design choice.

## Project structure

```
deviation-app/
├── backend/          FastAPI + SQLAlchemy + LangGraph + Groq
│   ├── app/
│   │   ├── ai/        LangGraph pipeline, Groq client, file parser
│   │   ├── routers/   /api/deviations, /api/ai endpoints
│   │   ├── main.py, models.py, schemas.py, database.py, config.py
│   └── requirements.txt, .env.example
└── frontend/         React + Redux Toolkit (Vite)
    └── src/
        ├── store/      deviationSlice, aiSlice
        ├── components/ DeviationForm.jsx (left), AIPanel.jsx (right)
        └── api/client.js
```

## 1. Get a free Groq API key

Sign up at https://console.groq.com/keys — it's free and takes under a minute.

## 2. Run the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and paste your GROQ_API_KEY

uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (interactive docs at `/docs`).
By default it uses a local SQLite file `deviation.db` — no DB server *and no extra
driver* needed for that. To use Postgres or MySQL instead, change `DATABASE_URL` in
`.env` (examples in `.env.example`) and install the matching optional driver:

```bash
pip install -r requirements-postgres.txt   # if using Postgres
pip install -r requirements-mysql.txt      # if using MySQL
```

(These are kept out of the base `requirements.txt` on purpose — `psycopg2-binary`
needs a C compiler on some platforms if pip can't find a prebuilt wheel for your
Python version, which isn't needed at all for the SQLite default.)

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` to `localhost:8000` automatically (see `vite.config.js`).

## 4. Try the workflow

1. On the right panel, paste something like:

   > During Batch APX-2451 manufacturing at the API Manufacturing Unit on 12-09-2026,
   > the reactor temperature exceeded the validated upper limit of 85°C, reaching 92°C
   > for approximately 15 minutes during the crystallization step. This was detected by
   > the shift operator via the DCS temperature alarm. Product is Ibuprofen API.

2. Click **Extract with AI**. Watch the progress bar — the backend runs a 2-step
   LangGraph pipeline (extract fields → recommend impact/severity).
3. The left "Log Deviation" form auto-fills — review/edit anything.
4. Click **Save Deviation** — it's persisted via `POST /api/deviations`.
5. You can also drag & drop a `.pdf` / `.docx` / `.txt` file instead of pasting text,
   or ask the "AI ASSISTANT" chat box a free-form question.

## Notes

- The left form is intentionally locked/disabled until the AI panel has run at least
  once — per the requirement to fill it via AI, not by typing directly.
- `GROQ_MODEL` in `.env` defaults to `llama-3.3-70b-versatile`; swap to `gemma2-9b-it`
  or any other Groq-hosted model with one line change.
- What's verified working: backend boots, DB read/write round-trips, frontend builds
  cleanly. What requires your own Groq key to test: the actual AI extraction/chat
  calls (I don't have a live key in this environment).
