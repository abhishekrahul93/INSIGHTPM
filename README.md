# InsightPM — AI Product Intelligence Platform

> Turn customer feedback into your next feature. GDPR-compliant, EU-first.

A complete product intelligence system for PMs: upload customer feedback, get AI-powered theme analysis, temporal trend detection, competitive intelligence, and auto-generated PRDs.

---

## Features

### 1. Theme Analysis (AI-powered)
Upload a CSV of customer feedback. InsightPM clusters it into themes, scores severity and sentiment, and identifies affected user segments.

### 2. Trend Detection (Pure Analytics)
The system auto-detects date columns, groups feedback by month, and computes growth rates per category. Alerts fire when any category spikes 50%+ or drops 50%+. No AI needed — this is classic data analytics.

Example output:
```
Performance complaints: Jan=2, Feb=5, Mar=8 → +60% spike detected
```

### 3. Competitive Intelligence (AI-powered)
Upload your feedback CSV alongside a competitor's (from G2, Trustpilot, etc.). Get a strategic comparison: your strengths, their strengths, opportunities to exploit, and threats to watch.

### 4. Auto PRD Generation (AI-powered)
Click "Generate PRD" on any recommendation. The AI creates a complete Product Requirements Document with: problem statement, goals, proposed solution, success metrics, timeline, risks, and open questions.

### 5. GDPR Compliance
- PII (emails, names, phones, IPs) stripped before AI processing
- Only anonymized summaries sent to Claude API
- No data stored after session
- Full audit trail visible in the GDPR tab

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key (https://console.anthropic.com)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Add your ANTHROPIC_API_KEY
ANTHROPIC_API_KEY=sk-ant-your-key uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /analyze/csv | Full analysis: themes + trends + recommendations |
| POST | /analyze/text | Quick text-based analysis |
| POST | /analyze/competitor | Competitive intelligence comparison |
| POST | /generate/prd | Generate PRD from a recommendation |
| GET | /sample-data | Sample CSV for demo (35 entries, 3 months) |
| GET | /health | Health check |

---

## Architecture

```
CSV Upload
    ↓
PII Anonymization (regex-based, no AI)
    ↓
Trend Detection (pure analytics — groupby + growth_rate)
    ↓
AI Theme Analysis (Claude API — anonymized summaries only)
    ↓
Recommendations (ranked by impact × frequency)
    ↓
PRD Generation (on demand, per recommendation)
```

---

## Tech Stack

- **Backend**: Python, FastAPI, Anthropic Claude API
- **Frontend**: React 18, Tailwind CSS, Recharts, Lucide Icons, Vite
- **Design**: GDPR-first architecture, session-only processing, EU deployment ready

---

## Skills Demonstrated

| Skill | Where |
|-------|-------|
| Data Analysis | Trend detection engine (groupby, growth rates, time series) |
| AI Engineering | Claude API integration with structured JSON output |
| Product Thinking | Feedback → Themes → Recommendations → PRD pipeline |
| System Design | FastAPI + React, GDPR architecture, API design |
| Frontend | React components, Recharts visualizations, Tailwind UI |

---

## License

MIT
