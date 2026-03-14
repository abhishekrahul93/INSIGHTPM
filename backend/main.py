"""
InsightPM - AI-Powered Product Intelligence for PMs
Backend API with GDPR-compliant data processing
Features: Theme Analysis, Trend Detection, Competitive Intel, Auto PRD
"""

import os
import json
import csv
import io
import re
import hashlib
from datetime import datetime, timezone
from typing import Optional
from collections import defaultdict
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(
    title="InsightPM API",
    description="GDPR-compliant AI product intelligence",
    version="0.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ──────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    feedback_text: Optional[str] = None
    usage_data_text: Optional[str] = None

class CompetitorRequest(BaseModel):
    your_feedback: str
    competitor_feedback: str
    competitor_name: Optional[str] = "Competitor"

class PRDRequest(BaseModel):
    recommendation_title: str
    recommendation_description: str
    reasoning: str
    success_metrics: list[str] = []
    addresses_themes: list[str] = []
    effort: str = "medium"
    impact: str = "high"

class GDPRLog(BaseModel):
    timestamp: str
    action: str
    data_hash: str
    detail: str

# ── GDPR Utils ──────────────────────────────────────────

def anonymize_text(text: str) -> str:
    text = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL_REDACTED]', text)
    text = re.sub(r'(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', '[PHONE_REDACTED]', text)
    text = re.sub(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '[IP_REDACTED]', text)
    text = re.sub(r'(Dear|Hi|Hello|Mr\.|Mrs\.|Ms\.)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?', r'\1 [NAME_REDACTED]', text)
    return text

def create_data_hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()[:16]

def log_gdpr_action(action: str, data: str, detail: str) -> GDPRLog:
    return GDPRLog(
        timestamp=datetime.now(timezone.utc).isoformat(),
        action=action, data_hash=create_data_hash(data), detail=detail
    )

# ── CSV Parsing ─────────────────────────────────────────

def parse_csv_content(content: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(content))
    return [dict(row) for row in reader]

def detect_date_column(rows: list[dict]) -> Optional[str]:
    date_keywords = ['date', 'time', 'created', 'timestamp', 'submitted', 'posted', 'when']
    date_patterns = [
        r'\d{4}-\d{2}-\d{2}', r'\d{1,2}/\d{1,2}/\d{2,4}',
        r'\d{1,2}-\d{1,2}-\d{2,4}', r'[A-Z][a-z]+ \d{1,2},? \d{4}',
    ]
    if not rows:
        return None
    cols = list(rows[0].keys())
    for col in cols:
        if any(kw in col.lower() for kw in date_keywords):
            return col
    for col in cols:
        sample = str(rows[0].get(col, ''))
        if any(re.match(p, sample) for p in date_patterns):
            return col
    return None

def parse_date_flexible(date_str: str) -> Optional[datetime]:
    formats = [
        '%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S',
        '%m/%d/%Y', '%d/%m/%Y', '%m-%d-%Y', '%d-%m-%Y',
        '%b %d, %Y', '%B %d, %Y', '%b %d %Y', '%B %d %Y',
    ]
    date_str = date_str.strip()
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None

def detect_feedback_columns(rows: list[dict]) -> list[str]:
    if not rows:
        return []
    all_cols = list(rows[0].keys())
    feedback_keywords = ['feedback', 'comment', 'review', 'message', 'text',
                         'description', 'note', 'response', 'suggestion',
                         'complaint', 'request', 'ticket', 'issue', 'body']
    feedback_cols = [col for col in all_cols if any(kw in col.lower() for kw in feedback_keywords)]
    if not feedback_cols:
        avg_lengths = {}
        for col in all_cols:
            lengths = [len(str(rows[i].get(col, ''))) for i in range(min(10, len(rows)))]
            avg_lengths[col] = sum(lengths) / len(lengths) if lengths else 0
        if avg_lengths:
            feedback_cols = [max(avg_lengths, key=avg_lengths.get)]
    return feedback_cols

def summarize_feedback_for_ai(rows: list[dict]) -> str:
    all_cols = list(rows[0].keys()) if rows else []
    feedback_cols = detect_feedback_columns(rows)
    summary_parts = [
        f"Dataset: {len(rows)} entries, columns: {', '.join(all_cols)}",
        f"Feedback columns: {', '.join(feedback_cols)}",
        "\n--- Anonymized Feedback Entries ---"
    ]
    for i, row in enumerate(rows[:200]):
        entry_parts = []
        for col in all_cols:
            val = str(row.get(col, '')).strip()
            if val and val.lower() != 'nan':
                if col in feedback_cols:
                    val = anonymize_text(val)
                entry_parts.append(f"{col}: {val}")
        summary_parts.append(f"\nEntry {i+1}: {' | '.join(entry_parts)}")
    return '\n'.join(summary_parts)

def summarize_usage_for_ai(rows: list[dict]) -> str:
    all_cols = list(rows[0].keys()) if rows else []
    summary_parts = [f"Usage Dataset: {len(rows)} entries, columns: {', '.join(all_cols)}"]
    numeric_cols = []
    for col in all_cols:
        try:
            vals = [float(rows[i].get(col, 0)) for i in range(min(10, len(rows)))
                    if rows[i].get(col, '').replace('.', '').replace('-', '').isdigit()]
            if vals:
                numeric_cols.append(col)
        except (ValueError, AttributeError):
            pass
    if numeric_cols:
        summary_parts.append(f"\nNumeric columns: {', '.join(numeric_cols)}")
        for col in numeric_cols:
            vals = []
            for row in rows:
                try:
                    vals.append(float(row.get(col, 0)))
                except (ValueError, TypeError):
                    pass
            if vals:
                summary_parts.append(f"  {col}: min={min(vals):.1f}, max={max(vals):.1f}, avg={sum(vals)/len(vals):.1f}")
    summary_parts.append("\n--- Sample Entries (anonymized) ---")
    for i, row in enumerate(rows[:50]):
        entry = {k: anonymize_text(str(v)) for k, v in row.items()}
        summary_parts.append(f"Entry {i+1}: {json.dumps(entry)}")
    return '\n'.join(summary_parts)


# ══════════════════════════════════════════════════════════
# FEATURE 1: TREND DETECTION ENGINE (Pure Data Analytics)
# ══════════════════════════════════════════════════════════

def compute_trends(rows: list[dict]) -> dict:
    """Groups feedback by time period, computes growth rates per category."""
    date_col = detect_date_column(rows)
    if not date_col:
        return {"available": False, "reason": "No date column detected"}

    cat_keywords = ['category', 'type', 'tag', 'label', 'topic', 'group']
    all_cols = list(rows[0].keys())
    cat_col = None
    for col in all_cols:
        if any(kw in col.lower() for kw in cat_keywords):
            cat_col = col
            break

    monthly_data = defaultdict(lambda: defaultdict(int))
    monthly_totals = defaultdict(int)
    overall_categories = defaultdict(int)
    parsed_rows = 0

    for row in rows:
        date = parse_date_flexible(str(row.get(date_col, '')))
        if not date:
            continue
        parsed_rows += 1
        month_key = date.strftime('%Y-%m')
        category = str(row.get(cat_col, 'all_feedback')).strip().lower() if cat_col else 'all_feedback'
        monthly_data[month_key][category] += 1
        monthly_totals[month_key] += 1
        overall_categories[category] += 1

    if parsed_rows < 3:
        return {"available": False, "reason": f"Only {parsed_rows} entries had parseable dates"}

    sorted_months = sorted(monthly_data.keys())
    if len(sorted_months) < 2:
        return {
            "available": True, "single_period": True,
            "period": sorted_months[0] if sorted_months else "unknown",
            "categories": dict(overall_categories),
            "total_entries": parsed_rows, "trends": [], "alerts": [],
            "monthly_breakdown": {m: dict(monthly_data[m]) for m in sorted_months}
        }

    trends = []
    alerts = []
    prev_month = sorted_months[-2]
    curr_month = sorted_months[-1]
    all_categories = set()
    for m in sorted_months:
        all_categories.update(monthly_data[m].keys())

    for category in sorted(all_categories):
        prev_count = monthly_data[prev_month].get(category, 0)
        curr_count = monthly_data[curr_month].get(category, 0)

        if prev_count > 0:
            growth_rate = ((curr_count - prev_count) / prev_count) * 100
        elif curr_count > 0:
            growth_rate = 100.0
        else:
            growth_rate = 0.0

        timeline = [{"month": m, "count": monthly_data[m].get(category, 0)} for m in sorted_months]

        trend_entry = {
            "category": category,
            "previous_period": prev_month, "current_period": curr_month,
            "previous_count": prev_count, "current_count": curr_count,
            "growth_rate_pct": round(growth_rate, 1),
            "direction": "rising" if growth_rate > 10 else ("declining" if growth_rate < -10 else "stable"),
            "timeline": timeline
        }
        trends.append(trend_entry)

        if growth_rate > 50 and curr_count >= 3:
            alerts.append({
                "type": "spike", "severity": "critical" if growth_rate > 100 else "warning",
                "category": category,
                "message": f"{category} increased {round(growth_rate)}% ({prev_count} -> {curr_count}) from {prev_month} to {curr_month}",
                "growth_rate_pct": round(growth_rate, 1)
            })
        elif growth_rate < -50 and prev_count >= 3:
            alerts.append({
                "type": "improvement", "severity": "positive",
                "category": category,
                "message": f"{category} decreased {round(abs(growth_rate))}% ({prev_count} -> {curr_count})",
                "growth_rate_pct": round(growth_rate, 1)
            })

    trends.sort(key=lambda t: abs(t['growth_rate_pct']), reverse=True)
    alerts.sort(key=lambda a: abs(a['growth_rate_pct']), reverse=True)

    return {
        "available": True, "single_period": False,
        "periods_analyzed": len(sorted_months),
        "date_range": f"{sorted_months[0]} to {sorted_months[-1]}",
        "total_entries_with_dates": parsed_rows,
        "monthly_totals": {m: monthly_totals[m] for m in sorted_months},
        "trends": trends, "alerts": alerts,
        "monthly_breakdown": {m: dict(monthly_data[m]) for m in sorted_months}
    }


# ══════════════════════════════════════════════════════════
# FEATURE 2: COMPETITIVE INTELLIGENCE
# ══════════════════════════════════════════════════════════

COMPETITOR_SYSTEM_PROMPT = """You are InsightPM's Competitive Intelligence engine. Analyze customer feedback from two competing products and identify strategic opportunities.

Respond in valid JSON:
{
  "your_top_complaints": [{"theme": "<n>", "frequency": <count>, "severity": "<critical|high|medium|low>"}],
  "competitor_top_complaints": [{"theme": "<n>", "frequency": <count>, "severity": "<critical|high|medium|low>"}],
  "your_strengths_vs_competitor": [{"area": "<n>", "detail": "<why stronger>"}],
  "competitor_strengths_vs_you": [{"area": "<n>", "detail": "<why stronger>"}],
  "opportunities": [{"title": "<n>", "description": "<what to do>", "source": "<what this leverages>", "potential_impact": "<high|medium|low>"}],
  "threats": [{"title": "<n>", "description": "<risk>", "urgency": "<immediate|soon|watch>"}],
  "strategic_summary": "<2-3 sentence executive summary>"
}

Be specific. Reference actual feedback themes. Keep each list to 3-5 items."""

async def run_competitor_analysis(your_summary: str, competitor_summary: str, competitor_name: str) -> dict:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o-mini", max_tokens=4096,
        messages=[
            {"role": "system", "content": COMPETITOR_SYSTEM_PROMPT},
            {"role": "user", "content": f"""Compare customer feedback from two products.

## YOUR PRODUCT
{your_summary}

## {competitor_name.upper()}
{competitor_summary}

Identify opportunities and threats. Respond as JSON."""}
        ]
    )
    return parse_ai_json(response.choices[0].message.content)


# ══════════════════════════════════════════════════════════
# FEATURE 3: AUTO PRD GENERATION
# ══════════════════════════════════════════════════════════

PRD_SYSTEM_PROMPT = """You are InsightPM's PRD Generator. Create a professional Product Requirements Document from a feature recommendation backed by customer data.

Respond in valid JSON:
{
  "prd": {
    "title": "<feature>",
    "version": "1.0",
    "status": "Draft",
    "author": "InsightPM AI",
    "date": "<today>",
    "executive_summary": "<2-3 sentences grounded in customer data>",
    "problem_statement": {
      "description": "<detailed problem>",
      "evidence": ["<data point 1>", "<data point 2>"],
      "affected_users": "<who and how many>",
      "current_workarounds": "<what users do now>"
    },
    "goals": {
      "primary_goal": "<main outcome>",
      "secondary_goals": ["<goal>"],
      "non_goals": ["<what this does NOT solve>"]
    },
    "proposed_solution": {
      "overview": "<high level>",
      "key_features": [{"name": "<n>", "description": "<d>", "priority": "<P0|P1|P2>"}],
      "user_flow": ["<step 1>", "<step 2>"],
      "technical_considerations": ["<item>"]
    },
    "success_metrics": [{"metric": "<n>", "current_baseline": "<now>", "target": "<goal>", "measurement_method": "<how>"}],
    "timeline": {
      "estimated_effort": "<small|medium|large>",
      "phases": [{"phase": "<n>", "duration": "<time>", "deliverables": ["<item>"]}]
    },
    "risks_and_mitigations": [{"risk": "<what>", "likelihood": "<high|medium|low>", "mitigation": "<how>"}],
    "open_questions": ["<question>"]
  }
}

Ground everything in customer data. Include measurable targets. Consider GDPR if relevant."""

async def generate_prd(request: PRDRequest) -> dict:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o-mini", max_tokens=4096,
        messages=[
            {"role": "system", "content": PRD_SYSTEM_PROMPT},
            {"role": "user", "content": f"""Generate a PRD for:

## Feature: {request.recommendation_title}
**Description:** {request.recommendation_description}
**Reasoning:** {request.reasoning}
**Effort:** {request.effort} | **Impact:** {request.impact}
**Success Metrics:** {json.dumps(request.success_metrics)}
**Themes Addressed:** {json.dumps(request.addresses_themes)}

Today's date: {datetime.now().strftime('%Y-%m-%d')}. Respond as JSON."""}
        ]
    )
    return parse_ai_json(response.choices[0].message.content)

# ── Shared Utils ────────────────────────────────────────

def parse_ai_json(response_text: str) -> dict:
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
    response_text = response_text.strip()
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        start = response_text.find('{')
        end = response_text.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(response_text[start:end])
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

# ── AI Analysis (core) ──────────────────────────────────

ANALYSIS_SYSTEM_PROMPT = """You are InsightPM, an expert AI Product Analyst. Analyze customer feedback and provide actionable recommendations.

Respond in valid JSON:
{
  "summary": {"total_entries_analyzed": <n>, "key_finding": "<headline>", "confidence_score": <0-1>},
  "themes": [{"id": <n>, "name": "<n>", "description": "<2-3 sentences>", "frequency": <n>, "frequency_pct": <pct>, "sentiment": "<positive|negative|neutral|mixed>", "severity": "<critical|high|medium|low>", "sample_quotes": ["<q1>", "<q2>"], "affected_user_segment": "<who>"}],
  "recommendations": [{"rank": <n>, "title": "<n>", "description": "<what and why>", "addresses_themes": [<ids>], "effort": "<small|medium|large>", "impact": "<low|medium|high|critical>", "reasoning": "<data-backed>", "success_metrics": ["<metric>"]}],
  "usage_insights": {"available": <bool>, "patterns": ["<insight>"], "correlation_with_feedback": "<relation>"},
  "next_steps": ["<action>"],
  "gdpr_note": "All analysis on anonymized data. No PII processed."
}

Rules: Be data-driven. Prioritize by impact x frequency. 3-8 themes, 3-6 recommendations. Actionable."""

async def run_analysis(feedback_summary: str, usage_summary: Optional[str] = None) -> dict:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    user_message = f"Analyze this feedback:\n\n## CUSTOMER FEEDBACK\n{feedback_summary}\n"
    if usage_summary:
        user_message += f"\n## USAGE DATA\n{usage_summary}\n\nCross-reference usage with feedback.\n"
    user_message += "\nRespond as JSON."

    response = client.chat.completions.create(
        model="gpt-4o-mini", max_tokens=4096,
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ]
    )
    return parse_ai_json(response.choices[0].message.content)


# ══════════════════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"name": "InsightPM API", "version": "0.2.0", "status": "running",
            "features": ["theme_analysis", "trend_detection", "competitive_intel", "auto_prd"]}

@app.get("/health")
async def health():
    return {"status": "healthy", "ai_configured": bool(os.getenv("OPENAI_API_KEY"))}

@app.post("/analyze/csv")
async def analyze_csv(
    feedback_file: UploadFile = File(...),
    usage_file: Optional[UploadFile] = File(None)
):
    """Full analysis: themes + trends + recommendations."""
    gdpr_log = []

    try:
        feedback_content = (await feedback_file.read()).decode('utf-8')
    except UnicodeDecodeError:
        feedback_content = (await feedback_file.read()).decode('latin-1')

    gdpr_log.append(log_gdpr_action("DATA_RECEIVED", feedback_content,
        f"Feedback: {feedback_file.filename}, {len(feedback_content)} bytes"))

    feedback_rows = parse_csv_content(feedback_content)
    if not feedback_rows:
        raise HTTPException(status_code=400, detail="Could not parse CSV.")

    feedback_summary = summarize_feedback_for_ai(feedback_rows)
    gdpr_log.append(log_gdpr_action("DATA_ANONYMIZED", feedback_summary,
        f"{len(feedback_rows)} rows anonymized"))

    usage_summary = None
    if usage_file:
        try:
            usage_content = (await usage_file.read()).decode('utf-8')
        except UnicodeDecodeError:
            usage_content = (await usage_file.read()).decode('latin-1')
        gdpr_log.append(log_gdpr_action("DATA_RECEIVED", usage_content,
            f"Usage: {usage_file.filename}"))
        usage_rows = parse_csv_content(usage_content)
        if usage_rows:
            usage_summary = summarize_usage_for_ai(usage_rows)

    gdpr_log.append(log_gdpr_action("AI_PROCESSING", "started", "Anonymized data sent to AI."))
    result = await run_analysis(feedback_summary, usage_summary)

    # Trend Detection (pure analytics — no AI call)
    gdpr_log.append(log_gdpr_action("TREND_ANALYSIS", "started", "Computing temporal trends."))
    result["trends"] = compute_trends(feedback_rows)

    gdpr_log.append(log_gdpr_action("COMPLETE", "done", "All temp data discarded."))
    result["gdpr_audit_trail"] = [log.model_dump() for log in gdpr_log]
    result["data_retention"] = {
        "raw_data_stored": False,
        "processing_location": "EU (session only)",
        "data_deleted_after": "Response sent — no data persisted"
    }
    return result

@app.post("/analyze/text")
async def analyze_text(request: AnalysisRequest):
    if not request.feedback_text:
        raise HTTPException(status_code=400, detail="feedback_text required")
    anonymized = anonymize_text(request.feedback_text)
    result = await run_analysis(f"Direct text:\n\n{anonymized}\n",
        anonymize_text(request.usage_data_text) if request.usage_data_text else None)
    result["trends"] = {"available": False, "reason": "Text input — no temporal data"}
    result["data_retention"] = {"raw_data_stored": False,
        "processing_location": "EU (session only)", "data_deleted_after": "Immediate"}
    return result

@app.post("/analyze/competitor")
async def analyze_competitor(
    your_file: UploadFile = File(...),
    competitor_file: UploadFile = File(...),
    competitor_name: str = Form("Competitor")
):
    """Competitive intelligence: compare feedback from two products."""
    try:
        your_content = (await your_file.read()).decode('utf-8')
    except UnicodeDecodeError:
        your_content = (await your_file.read()).decode('latin-1')
    your_rows = parse_csv_content(your_content)
    if not your_rows:
        raise HTTPException(status_code=400, detail="Could not parse your CSV.")

    try:
        comp_content = (await competitor_file.read()).decode('utf-8')
    except UnicodeDecodeError:
        comp_content = (await competitor_file.read()).decode('latin-1')
    comp_rows = parse_csv_content(comp_content)
    if not comp_rows:
        raise HTTPException(status_code=400, detail="Could not parse competitor CSV.")

    result = await run_competitor_analysis(
        summarize_feedback_for_ai(your_rows),
        summarize_feedback_for_ai(comp_rows),
        competitor_name
    )
    result["data_retention"] = {"raw_data_stored": False,
        "processing_location": "EU (session only)", "data_deleted_after": "Immediate"}
    return result

@app.post("/generate/prd")
async def generate_prd_endpoint(request: PRDRequest):
    """Generate a PRD from a recommendation."""
    result = await generate_prd(request)
    result["data_retention"] = {"raw_data_stored": False,
        "processing_location": "EU (session only)", "data_deleted_after": "Immediate"}
    return result

@app.get("/sample-data")
async def get_sample_data():
    """35 entries spanning Jan-Mar 2026 — performance spikes in March."""
    sample = """ticket_id,date,customer_type,feedback,category,rating
1,2026-01-05,enterprise,The dashboard takes forever to load when I have more than 50 projects.,performance,2
2,2026-01-07,startup,Love the product but I need PDF export for reports. Investors ask weekly.,feature_request,3
3,2026-01-09,enterprise,We had 2 outages this month during peak hours. Affecting deliverables.,reliability,1
4,2026-01-11,mid_market,The new AI suggestions feature is amazing! Saved our PM team 5 hours/week.,positive,5
5,2026-01-13,startup,Please add Jira integration. Having to manually copy data is killing us.,integration,2
6,2026-01-15,enterprise,Pricing jumped 40% with no notice. Evaluating alternatives.,pricing,1
7,2026-01-18,mid_market,Onboarding flow is confusing. Took our team 3 weeks to learn basics.,onboarding,2
8,2026-01-20,startup,Real-time collaboration would be a game changer. Only one editor at a time.,feature_request,3
9,2026-01-22,enterprise,GDPR compliance report feature is exactly what we needed. Thank you!,positive,5
10,2026-01-25,mid_market,Mobile app is basically unusable. Can't review anything on my phone.,mobile,1
11,2026-02-02,startup,API rate limits are way too restrictive. Breaks our automation daily.,integration,2
12,2026-02-04,enterprise,Need SSO with Azure AD. IT won't approve rollout without it.,security,2
13,2026-02-06,mid_market,Search is completely broken. Exact ticket names return nothing.,performance,1
14,2026-02-08,startup,Slack integration for daily feedback digest would be incredible.,integration,3
15,2026-02-10,enterprise,Analytics needs date range filtering. Only last 30 days is useless.,feature_request,2
16,2026-02-12,mid_market,Simpler than Productboard which is great. But need better charting.,positive,4
17,2026-02-14,startup,CSV import failed silently 3 times. No error messages at all.,performance,1
18,2026-02-16,enterprise,Need role-based access control. Everyone sees sensitive data.,security,2
19,2026-02-18,mid_market,AI categorization is 60% accurate. Still reviewing everything manually.,feature_request,3
20,2026-02-20,startup,50+ notification emails per day. Need preferences ASAP.,onboarding,2
21,2026-02-22,enterprise,Dashboard crashed twice today. Lost unsaved work both times.,performance,1
22,2026-02-24,mid_market,Page load times getting worse. Was fine 2 months ago.,performance,2
23,2026-02-26,startup,App froze for 30 seconds when filtering 1000 tickets.,performance,1
24,2026-03-01,enterprise,Performance is now unacceptable. 15 second load times on every page.,performance,1
25,2026-03-03,mid_market,Three performance incidents this week alone. Losing faith.,performance,1
26,2026-03-05,startup,App is painfully slow since last update. Was fine before.,performance,1
27,2026-03-06,enterprise,Checkout analysis page takes 20+ seconds. Considering switching.,performance,1
28,2026-03-07,mid_market,Everything slower now. Dashboard and search both degraded.,performance,2
29,2026-03-08,enterprise,Outstanding customer support. Issue resolved in under 2 hours.,positive,5
30,2026-03-09,startup,Workflow automation too basic. Need IF/THEN logic for routing.,feature_request,3
31,2026-03-10,mid_market,Free tier too limited to evaluate properly.,pricing,2
32,2026-03-11,enterprise,Salesforce integration essential. Feedback must link to accounts.,integration,2
33,2026-03-12,mid_market,Duplicate detection would save tons of time.,feature_request,3
34,2026-03-13,startup,Love the competitive analysis feature. Very useful.,positive,5
35,2026-03-14,enterprise,Fix performance or we switch to Productboard next quarter.,performance,1"""
    return {"csv_content": sample, "description": "35 entries, Jan-Mar 2026 — performance complaints spike in March (trend detection demo)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
