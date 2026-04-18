# HCP CRM – Log Interaction Module
### AI-First CRM for Life Sciences | LangGraph + Groq + React + FastAPI

---

## 📁 Project Structure

```
hcp-crm/
├── frontend/                          # React + Redux frontend
│   ├── public/
│   │   └── index.html                 # HTML entry with Inter font
│   ├── src/
│   │   ├── App.js                     # Root layout (header + split screen)
│   │   ├── index.js                   # ReactDOM render + Redux Provider
│   │   ├── components/
│   │   │   ├── LogInteractionForm.jsx # Structured form (left panel)
│   │   │   ├── LogInteractionForm.css
│   │   │   ├── ChatInterface.jsx      # AI chat panel (right panel)
│   │   │   └── ChatInterface.css
│   │   ├── store/
│   │   │   ├── store.js               # Redux store config
│   │   │   ├── interactionSlice.js    # Form state + async thunks
│   │   │   └── chatSlice.js           # Chat state + async thunks
│   │   └── styles/
│   │       ├── global.css             # CSS variables + base reset
│   │       └── App.css                # Layout styles
│   ├── .env                           # REACT_APP_API_URL
│   └── package.json
│
├── backend/                           # Python FastAPI backend
│   ├── main.py                        # FastAPI app + CORS + routers
│   ├── agent.py                       # LangGraph agent (Groq gemma2-9b-it)
│   ├── models/
│   │   ├── database.py                # SQLAlchemy engine + session
│   │   ├── interaction.py             # Interaction ORM model
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── interaction.py             # Pydantic request/response schemas
│   │   └── __init__.py
│   ├── tools/
│   │   ├── hcp_tools.py               # All 5 LangGraph tools
│   │   └── __init__.py
│   ├── routers/
│   │   ├── interactions.py            # CRUD REST endpoints
│   │   ├── chat.py                    # /api/chat endpoint
│   │   └── __init__.py
│   ├── .env                           # GROQ_API_KEY + DATABASE_URL
│   └── requirements.txt
│
└── README.md
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                        │
│  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │  LogInteractionForm  │  │    ChatInterface       │   │
│  │  (Redux: form state) │  │  (Redux: chat state)   │   │
│  └──────────┬───────────┘  └──────────┬─────────────┘   │
│             │ POST /api/interactions  │ POST /api/chat   │
└─────────────┼─────────────────────────┼─────────────────┘
              ▼                         ▼
┌─────────────────────────────────────────────────────────┐
│                  FASTAPI BACKEND                         │
│  ┌─────────────────┐      ┌───────────────────────────┐ │
│  │  interactions   │      │       chat router         │ │
│  │  router (CRUD)  │      │  → run_agent(message)     │ │
│  └────────┬────────┘      └───────────┬───────────────┘ │
│           │                           ▼                  │
│           │               ┌───────────────────────────┐ │
│           │               │    LangGraph Agent        │ │
│           │               │  ┌─────────────────────┐  │ │
│           │               │  │  Groq LLM           │  │ │
│           │               │  │  (gemma2-9b-it)     │  │ │
│           │               │  └─────────────────────┘  │ │
│           │               │  Decides which tool:      │ │
│           │               │  1. log_interaction       │ │
│           │               │  2. edit_interaction      │ │
│           │               │  3. get_hcp_history       │ │
│           │               │  4. suggest_followup      │ │
│           │               │  5. analyze_sentiment     │ │
│           │               └───────────┬───────────────┘ │
└───────────┼───────────────────────────┼─────────────────┘
            ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│            PostgreSQL Database                           │
│               interactions table                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Redux Toolkit, Axios |
| Styling | CSS3, Google Inter Font |
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI Agent | LangGraph, LangChain |
| LLM | Groq API — `gemma2-9b-it` |
| Database | PostgreSQL + SQLAlchemy ORM |
| Font | Google Inter |

---

## ⚡ 5 LangGraph Tools

### 1. `log_interaction`
Saves a new HCP interaction to the database. The LLM extracts structured data (HCP name, sentiment, topics) from natural language input and generates an AI summary before persisting.

### 2. `edit_interaction`
Retrieves an existing interaction by ID and updates only the provided fields. Allows reps to correct or add info after the fact without overwriting unchanged data.

### 3. `get_hcp_history`
Queries the database for past interactions with a given HCP name (partial match). Returns sorted records with topics, sentiment, and outcomes for context before a visit.

### 4. `suggest_followup`
Generates 3 context-aware follow-up action recommendations based on HCP name, topics discussed, sentiment, and outcomes. Uses rule-based logic + LLM context to tailor suggestions.

### 5. `analyze_sentiment`
Analyzes the tone of an interaction description using keyword pattern matching. Returns `Positive`, `Neutral`, or `Negative` with a confidence percentage and explanation.

---

## 🚀 Setup & Running

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL running locally

### Step 1 — Database Setup
```sql
CREATE DATABASE hcp_crm;
```

### Step 2 — Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Edit .env file:
# GROQ_API_KEY=your_key_from_console.groq.com
# DATABASE_URL=postgresql://postgres:password@localhost:5432/hcp_crm

uvicorn main:app --reload --port 8000
```

### Step 3 — Frontend Setup
```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000
```

### Step 4 — Get Groq API Key
1. Go to https://console.groq.com
2. Sign up / Log in
3. Navigate to API Keys → Create Key
4. Paste key in `backend/.env`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interactions/` | Create new interaction |
| GET | `/api/interactions/` | List all interactions |
| GET | `/api/interactions/{id}` | Get single interaction |
| PUT | `/api/interactions/{id}` | Update interaction |
| DELETE | `/api/interactions/{id}` | Delete interaction |
| POST | `/api/chat/` | Chat with AI agent |

---

## 💬 Example Chat Prompts (for demo)

```
# Tool: log_interaction
"Met Dr. Sharma today at Apollo Hospital, discussed OncoBoost Phase III results, positive sentiment"

# Tool: get_hcp_history
"Show me all past interactions with Dr. Patel"

# Tool: analyze_sentiment
"Analyze sentiment: The doctor was skeptical and raised concerns about side effects"

# Tool: suggest_followup
"Suggest follow-ups for Dr. Mehta after discussing product efficacy with positive response"

# Tool: edit_interaction
"Update interaction ID 3 to change sentiment to Positive"
```

---

## 📊 Database Schema

```sql
CREATE TABLE interactions (
  id                    SERIAL PRIMARY KEY,
  hcp_name              VARCHAR(255) NOT NULL,
  interaction_type      VARCHAR(100),
  date                  DATE NOT NULL,
  time                  TIME,
  attendees             TEXT,
  topics_discussed      TEXT,
  materials_shared      TEXT,
  samples_distributed   TEXT,
  sentiment             VARCHAR(50),
  outcomes              TEXT,
  followup_actions      TEXT,
  ai_summary            TEXT,
  ai_suggested_followups TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP
);
```

---

## 🧠 LangGraph Agent Flow

```
User Message
     │
     ▼
[START] → agent_node (Groq LLM + tools bound)
     │
     ├─ has tool_calls? ──YES──► tool_node (executes tool)
     │                                  │
     │                                  └──► agent_node (formats response)
     │
     └─ no tool_calls? ──────────────────► END (return text)
```

---

## 🎥 Video Demo Checklist
- [ ] Show running frontend at localhost:3000
- [ ] Demo structured form → submit → see AI followups
- [ ] Demo chat: log_interaction tool
- [ ] Demo chat: get_hcp_history tool  
- [ ] Demo chat: analyze_sentiment tool
- [ ] Demo chat: suggest_followup tool
- [ ] Demo chat: edit_interaction tool
- [ ] Explain code architecture (agent → tools → DB flow)

---

*Built with LangGraph + Groq (gemma2-9b-it) | Life Sciences HCP CRM Module*
