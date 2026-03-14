import { useState, useCallback, useRef } from 'react'
import {
  Upload, FileText, Shield, BarChart3, Lightbulb, AlertTriangle,
  CheckCircle2, ChevronRight, Trash2, Download, ArrowRight,
  TrendingUp, TrendingDown, Users, Zap, Eye, EyeOff, Loader2, Sparkles,
  Database, Lock, X, ArrowUpRight, ArrowDownRight, Minus, Swords,
  FileOutput, Activity, Clock, Target, AlertCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

const API_BASE = '/api'

const SEVERITY_CONFIG = {
  critical: { color: '#dc2626', bg: '#fef2f2', label: 'Critical' },
  high: { color: '#d97706', bg: '#fffbeb', label: 'High' },
  medium: { color: '#2563eb', bg: '#eff6ff', label: 'Medium' },
  low: { color: '#16a34a', bg: '#f0fdf4', label: 'Low' },
}
const SENTIMENT_CONFIG = {
  negative: { color: '#dc2626', icon: '↓' },
  positive: { color: '#16a34a', icon: '↑' },
  neutral: { color: '#908a79', icon: '→' },
  mixed: { color: '#d97706', icon: '↕' },
}
const EFFORT_LABELS = { small: '🟢 Small', medium: '🟡 Medium', large: '🔴 Large' }
const IMPACT_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }
const PIE_COLORS = ['#2563eb', '#dc2626', '#d97706', '#16a34a', '#7c3aed', '#0891b2', '#be185d', '#65a30d']
const TREND_COLORS = ['#2563eb', '#dc2626', '#d97706', '#16a34a', '#7c3aed', '#0891b2', '#be185d', '#65a30d']

// ═══════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════

function Header() {
  return (
    <header className="border-b border-ink-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink-950 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl text-ink-950">InsightPM</h1>
            <p className="text-xs text-ink-500 font-body tracking-wide">AI Product Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <Shield className="w-3.5 h-3.5 text-signal-green" />
          <span className="font-medium">GDPR Compliant</span>
          <span className="text-ink-300 mx-1">·</span>
          <span>EU Processing</span>
        </div>
      </div>
    </header>
  )
}

function UploadZone({ label, description, file, onFileChange, onRemove, accept = '.csv', icon: Icon = FileText }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-700">{label}</label>
      {file ? (
        <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-900">{file.name}</p>
              <p className="text-xs text-ink-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button onClick={onRemove} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-signal-red" />
          </button>
        </div>
      ) : (
        <div
          className={`upload-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${dragging ? 'dragging' : 'border-ink-200'}`}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setDragging(false); e.dataTransfer.files?.[0] && onFileChange(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept={accept}
            onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])} className="hidden" />
          <Icon className="w-8 h-8 text-ink-400 mx-auto mb-3" />
          <p className="text-sm text-ink-700 font-medium mb-1">Drop your CSV here or click to browse</p>
          <p className="text-xs text-ink-400">{description}</p>
        </div>
      )}
    </div>
  )
}

function ProcessingState({ message = "Analyzing your data" }) {
  return (
    <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
      <div className="relative w-16 h-16 mx-auto mb-8">
        <div className="absolute inset-0 rounded-2xl bg-accent/10 animate-pulse-subtle" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      </div>
      <h3 className="font-display text-2xl text-ink-950 mb-2">{message}</h3>
      <p className="text-sm text-ink-500">GDPR-safe — only anonymized summaries reach the AI</p>
    </div>
  )
}

function SummaryCards({ summary, themes }) {
  const criticalCount = themes.filter(t => t.severity === 'critical').length
  const cards = [
    { label: 'Entries Analyzed', value: summary.total_entries_analyzed, icon: Database, color: 'text-accent', bg: 'bg-accent/5' },
    { label: 'Themes Found', value: themes.length, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Critical Issues', value: criticalCount, icon: AlertTriangle,
      color: criticalCount > 0 ? 'text-signal-red' : 'text-signal-green',
      bg: criticalCount > 0 ? 'bg-red-50' : 'bg-green-50' },
    { label: 'Confidence', value: `${(summary.confidence_score * 100).toFixed(0)}%`, icon: Zap, color: 'text-signal-green', bg: 'bg-green-50' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className={`animate-slide-up stagger-${i + 1} p-5 rounded-2xl border border-ink-100 bg-white hover:shadow-md transition-shadow`}>
          <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
            <card.icon className={`w-5 h-5 ${card.color}`} />
          </div>
          <p className="text-2xl font-display text-ink-950">{card.value}</p>
          <p className="text-xs text-ink-500 mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// THEMES TAB
// ═══════════════════════════════════════════════════

function ThemeCard({ theme, index }) {
  const [expanded, setExpanded] = useState(false)
  const severity = SEVERITY_CONFIG[theme.severity] || SEVERITY_CONFIG.medium
  const sentiment = SENTIMENT_CONFIG[theme.sentiment] || SENTIMENT_CONFIG.neutral
  return (
    <div className={`animate-slide-up stagger-${index + 1} p-5 rounded-2xl border border-ink-100 bg-white hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: severity.bg, color: severity.color }}>{severity.label}</span>
          <span className="text-xs text-ink-400">{sentiment.icon} {theme.sentiment}</span>
        </div>
        <span className="text-xs font-mono text-ink-400">{theme.frequency_pct?.toFixed(0) || '—'}%</span>
      </div>
      <h4 className="font-display text-lg text-ink-950 mb-1">{theme.name}</h4>
      <p className="text-sm text-ink-600 leading-relaxed mb-3">{theme.description}</p>
      <div className="flex items-center gap-4 text-xs text-ink-500 mb-3">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{theme.frequency} mentions</span>
        {theme.affected_user_segment && <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{theme.affected_user_segment}</span>}
      </div>
      {theme.sample_quotes?.length > 0 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-accent hover:text-accent-dark font-medium">
          {expanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {expanded ? 'Hide' : 'Show'} quotes
        </button>
      )}
      {expanded && theme.sample_quotes && (
        <div className="mt-3 space-y-2">
          {theme.sample_quotes.map((q, i) => (
            <p key={i} className="text-xs text-ink-600 italic pl-3 border-l-2 border-ink-200">"{q}"</p>
          ))}
        </div>
      )}
    </div>
  )
}

function ThemesChart({ themes }) {
  const data = themes.map(t => ({
    name: t.name.length > 20 ? t.name.substring(0, 20) + '…' : t.name,
    mentions: t.frequency,
  })).sort((a, b) => b.mentions - a.mentions)
  return (
    <div className="animate-slide-up p-6 rounded-2xl border border-ink-100 bg-white">
      <h3 className="font-display text-lg text-ink-950 mb-6">Theme frequency</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eeedea" />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#908a79' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#625d53' }} width={140} />
          <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eeedea', borderRadius: '12px', fontSize: '12px' }} />
          <Bar dataKey="mentions" radius={[0, 6, 6, 0]} fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SentimentPie({ themes }) {
  const sentimentCounts = themes.reduce((acc, t) => { acc[t.sentiment] = (acc[t.sentiment] || 0) + t.frequency; return acc }, {})
  const data = Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }))
  return (
    <div className="animate-slide-up p-6 rounded-2xl border border-ink-100 bg-white">
      <h3 className="font-display text-lg text-ink-950 mb-6">Sentiment distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={SENTIMENT_CONFIG[entry.name]?.color || PIE_COLORS[i]} />)}
          </Pie>
          <Tooltip />
          <Legend formatter={(v) => <span className="text-xs text-ink-600 capitalize">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function ThemesTab({ themes, usageInsights }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ThemesChart themes={themes || []} />
        <SentimentPie themes={themes || []} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes?.map((theme, i) => <ThemeCard key={i} theme={theme} index={i} />)}
      </div>
      {usageInsights?.available && (
        <div className="animate-slide-up rounded-2xl border border-ink-100 bg-white p-5">
          <h3 className="font-display text-lg text-ink-950 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />Usage insights
          </h3>
          {usageInsights.patterns?.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-ink-600 mb-2">
              <ArrowRight className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" /><span>{p}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// FEATURE 1: TRENDS TAB
// ═══════════════════════════════════════════════════

function TrendAlertBanner({ alerts }) {
  if (!alerts?.length) return null
  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => {
        const isSpike = alert.type === 'spike'
        return (
          <div key={i} className={`p-4 rounded-xl flex items-start gap-3 ${isSpike ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            {isSpike
              ? <ArrowUpRight className="w-5 h-5 text-signal-red shrink-0 mt-0.5" />
              : <ArrowDownRight className="w-5 h-5 text-signal-green shrink-0 mt-0.5" />}
            <div>
              <p className={`text-sm font-medium ${isSpike ? 'text-signal-red' : 'text-signal-green'}`}>
                {isSpike ? 'Spike Detected' : 'Improvement Detected'}
              </p>
              <p className="text-xs text-ink-600 mt-0.5">{alert.message}</p>
            </div>
            <span className={`ml-auto text-lg font-display ${isSpike ? 'text-signal-red' : 'text-signal-green'}`}>
              {isSpike ? '+' : ''}{alert.growth_rate_pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TrendTimeline({ trends }) {
  if (!trends?.length) return null
  const months = trends[0]?.timeline?.map(t => t.month) || []
  const chartData = months.map(month => {
    const point = { month: month.slice(5) }
    trends.forEach(t => {
      const entry = t.timeline.find(e => e.month === month)
      point[t.category] = entry?.count || 0
    })
    return point
  })
  const topTrends = trends.slice(0, 6)
  return (
    <div className="animate-slide-up p-6 rounded-2xl border border-ink-100 bg-white">
      <h3 className="font-display text-lg text-ink-950 mb-6">Category trends over time</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eeedea" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#908a79' }} />
          <YAxis tick={{ fontSize: 12, fill: '#908a79' }} />
          <Tooltip contentStyle={{ background: '#fff', border: '1px solid #eeedea', borderRadius: '12px', fontSize: '12px' }} />
          <Legend formatter={(v) => <span className="text-xs text-ink-600">{v}</span>} />
          {topTrends.map((t, i) => (
            <Line key={t.category} type="monotone" dataKey={t.category}
              stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function TrendTable({ trends }) {
  return (
    <div className="animate-slide-up rounded-2xl border border-ink-100 bg-white overflow-hidden">
      <div className="p-5 border-b border-ink-100">
        <h3 className="font-display text-lg text-ink-950">Growth rates by category</h3>
        <p className="text-xs text-ink-500 mt-1">Comparing the last two time periods</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/50">
              <th className="text-left text-xs font-medium text-ink-500 uppercase tracking-wider px-5 py-3">Category</th>
              <th className="text-right text-xs font-medium text-ink-500 uppercase tracking-wider px-5 py-3">Previous</th>
              <th className="text-right text-xs font-medium text-ink-500 uppercase tracking-wider px-5 py-3">Current</th>
              <th className="text-right text-xs font-medium text-ink-500 uppercase tracking-wider px-5 py-3">Growth</th>
              <th className="text-center text-xs font-medium text-ink-500 uppercase tracking-wider px-5 py-3">Direction</th>
            </tr>
          </thead>
          <tbody>
            {trends.map((t, i) => {
              const dirIcon = t.direction === 'rising' ? <ArrowUpRight className="w-4 h-4 text-signal-red" />
                : t.direction === 'declining' ? <ArrowDownRight className="w-4 h-4 text-signal-green" />
                : <Minus className="w-4 h-4 text-ink-400" />
              const growthColor = t.growth_rate_pct > 20 ? 'text-signal-red' : t.growth_rate_pct < -20 ? 'text-signal-green' : 'text-ink-600'
              return (
                <tr key={i} className="border-b border-ink-50 hover:bg-ink-50/30 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-ink-900 capitalize">{t.category.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 text-sm text-ink-600 text-right font-mono">{t.previous_count}</td>
                  <td className="px-5 py-3 text-sm text-ink-600 text-right font-mono">{t.current_count}</td>
                  <td className={`px-5 py-3 text-sm text-right font-mono font-medium ${growthColor}`}>
                    {t.growth_rate_pct > 0 ? '+' : ''}{t.growth_rate_pct}%
                  </td>
                  <td className="px-5 py-3 flex justify-center">{dirIcon}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TrendsTab({ trends }) {
  if (!trends?.available) {
    return (
      <div className="text-center py-16">
        <Activity className="w-12 h-12 text-ink-300 mx-auto mb-4" />
        <h3 className="font-display text-lg text-ink-700 mb-2">Trend detection needs timestamps</h3>
        <p className="text-sm text-ink-500 max-w-md mx-auto">
          {trends?.reason || 'Add a date column to your CSV (e.g., "date", "created_at") spanning at least 2 months to see trends.'}
        </p>
      </div>
    )
  }
  if (trends.single_period) {
    return (
      <div className="text-center py-16">
        <Activity className="w-12 h-12 text-ink-300 mx-auto mb-4" />
        <h3 className="font-display text-lg text-ink-700 mb-2">Only one time period found</h3>
        <p className="text-sm text-ink-500">Upload data spanning 2+ months to see growth trends.</p>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3">
        <Activity className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-ink-900">Trend Analysis — {trends.date_range}</p>
          <p className="text-xs text-ink-500 mt-0.5">
            {trends.periods_analyzed} periods analyzed · {trends.total_entries_with_dates} date-stamped entries · Pure analytics, no AI
          </p>
        </div>
      </div>
      <TrendAlertBanner alerts={trends.alerts} />
      <TrendTimeline trends={trends.trends} />
      <TrendTable trends={trends.trends} />
    </div>
  )
}

// ═══════════════════════════════════════════════════
// RECOMMENDATIONS TAB (with PRD generation)
// ═══════════════════════════════════════════════════

function RecommendationCard({ rec, index, onGeneratePRD, prdLoading }) {
  const [expanded, setExpanded] = useState(index === 0)
  return (
    <div className={`animate-slide-up stagger-${index + 1} rounded-2xl border bg-white transition-all ${expanded ? 'border-accent/30 shadow-md' : 'border-ink-100 hover:shadow-md'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 flex items-center gap-4 text-left">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display text-lg shrink-0 ${index === 0 ? 'bg-accent text-white' : 'bg-ink-100 text-ink-700'}`}>
          {rec.rank}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-base text-ink-950 truncate">{rec.title}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-ink-500">{EFFORT_LABELS[rec.effort] || rec.effort}</span>
            <span className="text-xs text-ink-300">·</span>
            <span className="text-xs font-medium text-accent">{IMPACT_LABELS[rec.impact] || rec.impact} impact</span>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-ink-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-ink-100 pt-4 space-y-4">
          <p className="text-sm text-ink-700 leading-relaxed">{rec.description}</p>
          <div>
            <p className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-1">Reasoning</p>
            <p className="text-sm text-ink-600 leading-relaxed">{rec.reasoning}</p>
          </div>
          {rec.success_metrics?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-2">Success metrics</p>
              {rec.success_metrics.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-ink-600 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-signal-green mt-0.5 shrink-0" /><span>{m}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onGeneratePRD(rec)} disabled={prdLoading}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-ink-950 text-white text-sm font-medium hover:bg-ink-800 transition-colors disabled:opacity-50">
            {prdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileOutput className="w-4 h-4" />}
            Generate PRD
          </button>
        </div>
      )}
    </div>
  )
}

function RecommendationsTab({ recommendations, nextSteps, onGeneratePRD, prdLoading }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-ink-900">Prioritized by Impact × Frequency</p>
          <p className="text-xs text-ink-500 mt-0.5">Click "Generate PRD" on any recommendation to create a full Product Requirements Document.</p>
        </div>
      </div>
      {recommendations?.map((rec, i) => (
        <RecommendationCard key={i} rec={rec} index={i} onGeneratePRD={onGeneratePRD} prdLoading={prdLoading} />
      ))}
      {nextSteps?.length > 0 && (
        <div className="p-5 rounded-2xl border border-ink-100 bg-white">
          <h3 className="font-display text-base text-ink-950 mb-3">Suggested next steps</h3>
          {nextSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-ink-600 mb-2">
              <span className="font-mono text-accent text-xs mt-0.5">{i + 1}.</span><span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// FEATURE 3: PRD VIEWER
// ═══════════════════════════════════════════════════

function PRDViewer({ prd, onClose, onExport }) {
  if (!prd?.prd) return null
  const p = prd.prd
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink-950">{p.title}</h2>
          <p className="text-xs text-ink-500 mt-1">PRD v{p.version} · {p.status} · {p.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExport} className="flex items-center gap-2 py-2 px-4 rounded-xl border border-ink-200 text-sm text-ink-600 hover:bg-ink-50">
            <Download className="w-4 h-4" />Export
          </button>
          <button onClick={onClose} className="flex items-center gap-2 py-2 px-4 rounded-xl bg-ink-950 text-white text-sm hover:bg-ink-800">
            Back to Analysis
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-accent/20 bg-accent/5">
        <p className="text-sm font-medium text-ink-900 mb-1">Executive summary</p>
        <p className="text-sm text-ink-700 leading-relaxed">{p.executive_summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl border border-ink-100 bg-white">
          <h3 className="font-display text-base text-ink-950 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-signal-red" />Problem
          </h3>
          <p className="text-sm text-ink-700 leading-relaxed mb-3">{p.problem_statement?.description}</p>
          {p.problem_statement?.evidence?.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-ink-600 mb-1">
              <ArrowRight className="w-3 h-3 text-accent mt-0.5 shrink-0" /><span>{e}</span>
            </div>
          ))}
          <div className="mt-3 p-3 rounded-lg bg-ink-50 text-xs text-ink-600">
            <span className="font-medium">Affected users:</span> {p.problem_statement?.affected_users}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-ink-100 bg-white">
          <h3 className="font-display text-base text-ink-950 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />Goals
          </h3>
          <p className="text-sm font-medium text-ink-900 mb-2">{p.goals?.primary_goal}</p>
          {p.goals?.secondary_goals?.map((g, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-ink-600 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-signal-green mt-0.5 shrink-0" /><span>{g}</span>
            </div>
          ))}
          {p.goals?.non_goals?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-ink-100">
              <p className="text-xs font-medium text-ink-500 mb-1">Non-goals</p>
              {p.goals.non_goals.map((ng, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-ink-500 mb-1">
                  <X className="w-3 h-3 text-ink-400 mt-0.5 shrink-0" /><span>{ng}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-ink-100 bg-white">
        <h3 className="font-display text-base text-ink-950 mb-3">Proposed solution</h3>
        <p className="text-sm text-ink-700 leading-relaxed mb-4">{p.proposed_solution?.overview}</p>
        <div className="space-y-3">
          {p.proposed_solution?.key_features?.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-ink-50">
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full shrink-0 ${
                f.priority === 'P0' ? 'bg-red-100 text-signal-red' : f.priority === 'P1' ? 'bg-amber-100 text-signal-amber' : 'bg-blue-100 text-accent'
              }`}>{f.priority}</span>
              <div>
                <p className="text-sm font-medium text-ink-900">{f.name}</p>
                <p className="text-xs text-ink-600 mt-0.5">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-ink-100 bg-white">
        <h3 className="font-display text-base text-ink-950 mb-3">Success metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left text-xs font-medium text-ink-500 uppercase px-3 py-2">Metric</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase px-3 py-2">Baseline</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase px-3 py-2">Target</th>
                <th className="text-left text-xs font-medium text-ink-500 uppercase px-3 py-2">How to measure</th>
              </tr>
            </thead>
            <tbody>
              {p.success_metrics?.map((m, i) => (
                <tr key={i} className="border-b border-ink-50">
                  <td className="px-3 py-2 text-sm font-medium text-ink-900">{m.metric}</td>
                  <td className="px-3 py-2 text-sm text-ink-600">{m.current_baseline}</td>
                  <td className="px-3 py-2 text-sm text-accent font-medium">{m.target}</td>
                  <td className="px-3 py-2 text-xs text-ink-500">{m.measurement_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl border border-ink-100 bg-white">
          <h3 className="font-display text-base text-ink-950 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />Timeline
          </h3>
          {p.timeline?.phases?.map((phase, i) => (
            <div key={i} className="flex gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-mono text-accent shrink-0">{i + 1}</div>
              <div>
                <p className="text-sm font-medium text-ink-900">{phase.phase} <span className="text-xs text-ink-400">({phase.duration})</span></p>
                {phase.deliverables?.map((d, j) => (
                  <p key={j} className="text-xs text-ink-600 mt-0.5">• {d}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl border border-ink-100 bg-white">
          <h3 className="font-display text-base text-ink-950 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-signal-amber" />Risks
          </h3>
          {p.risks_and_mitigations?.map((r, i) => (
            <div key={i} className="mb-3 p-3 rounded-xl bg-ink-50">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-ink-900">{r.risk}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  r.likelihood === 'high' ? 'bg-red-100 text-signal-red' : r.likelihood === 'medium' ? 'bg-amber-100 text-signal-amber' : 'bg-green-100 text-signal-green'
                }`}>{r.likelihood}</span>
              </div>
              <p className="text-xs text-ink-600">{r.mitigation}</p>
            </div>
          ))}
        </div>
      </div>

      {p.open_questions?.length > 0 && (
        <div className="p-5 rounded-2xl border border-ink-100 bg-white">
          <h3 className="font-display text-base text-ink-950 mb-3">Open questions</h3>
          {p.open_questions.map((q, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-ink-600 mb-2">
              <span className="text-accent">?</span><span>{q}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// FEATURE 2: COMPETITIVE INTELLIGENCE TAB
// ═══════════════════════════════════════════════════

function CompetitorTab({ onRunCompetitor, competitorResult, competitorLoading }) {
  const [yourFile, setYourFile] = useState(null)
  const [compFile, setCompFile] = useState(null)
  const [compName, setCompName] = useState('')

  if (competitorLoading) return <ProcessingState message="Comparing competitive landscape" />

  if (competitorResult) {
    const r = competitorResult
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="p-5 rounded-2xl border border-accent/20 bg-accent/5">
          <h3 className="font-display text-base text-ink-950 mb-2">Strategic summary</h3>
          <p className="text-sm text-ink-700 leading-relaxed">{r.strategic_summary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl border border-ink-100 bg-white">
            <h3 className="font-display text-base text-ink-950 mb-3 text-signal-green">Your strengths</h3>
            {r.your_strengths_vs_competitor?.map((s, i) => (
              <div key={i} className="mb-3 p-3 rounded-xl bg-green-50">
                <p className="text-sm font-medium text-ink-900">{s.area}</p>
                <p className="text-xs text-ink-600 mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
          <div className="p-5 rounded-2xl border border-ink-100 bg-white">
            <h3 className="font-display text-base text-ink-950 mb-3 text-signal-red">Their strengths</h3>
            {r.competitor_strengths_vs_you?.map((s, i) => (
              <div key={i} className="mb-3 p-3 rounded-xl bg-red-50">
                <p className="text-sm font-medium text-ink-900">{s.area}</p>
                <p className="text-xs text-ink-600 mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-ink-100 bg-white">
          <h3 className="font-display text-base text-ink-950 mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />Opportunities
          </h3>
          {r.opportunities?.map((o, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 p-3 rounded-xl bg-accent/5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono ${
                o.potential_impact === 'high' ? 'bg-accent text-white' : 'bg-accent/10 text-accent'
              }`}>{i + 1}</div>
              <div>
                <p className="text-sm font-medium text-ink-900">{o.title}</p>
                <p className="text-xs text-ink-600 mt-0.5">{o.description}</p>
                <p className="text-xs text-ink-400 mt-1">Source: {o.source}</p>
              </div>
            </div>
          ))}
        </div>

        {r.threats?.length > 0 && (
          <div className="p-5 rounded-2xl border border-red-200 bg-red-50/50">
            <h3 className="font-display text-base text-ink-950 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-signal-red" />Threats
            </h3>
            {r.threats.map((t, i) => (
              <div key={i} className="mb-3 p-3 rounded-xl bg-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-ink-900">{t.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.urgency === 'immediate' ? 'bg-red-100 text-signal-red' : t.urgency === 'soon' ? 'bg-amber-100 text-signal-amber' : 'bg-ink-100 text-ink-600'
                  }`}>{t.urgency}</span>
                </div>
                <p className="text-xs text-ink-600">{t.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3">
        <Swords className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-ink-900">Competitive Intelligence</p>
          <p className="text-xs text-ink-500 mt-0.5">Upload your feedback CSV and a competitor's (e.g., from G2 or Trustpilot) to find strategic opportunities.</p>
        </div>
      </div>
      <UploadZone label="Your Product Feedback" description="Your customer feedback CSV"
        file={yourFile} onFileChange={setYourFile} onRemove={() => setYourFile(null)} icon={Upload} />
      <UploadZone label="Competitor Feedback" description="Competitor reviews CSV (from G2, Trustpilot, etc.)"
        file={compFile} onFileChange={setCompFile} onRemove={() => setCompFile(null)} icon={Swords} />
      <div>
        <label className="text-sm font-medium text-ink-700 block mb-2">Competitor Name</label>
        <input type="text" value={compName} onChange={(e) => setCompName(e.target.value)}
          placeholder="e.g., Productboard" className="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
      </div>
      <button onClick={() => onRunCompetitor(yourFile, compFile, compName || 'Competitor')}
        disabled={!yourFile || !compFile}
        className="w-full py-3.5 rounded-xl font-medium text-sm bg-ink-950 text-white hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
        <Swords className="w-4 h-4" />Run Competitive Analysis
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// GDPR TAB
// ═══════════════════════════════════════════════════

function GDPRTab({ log, retention }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-signal-green" />
        <div>
          <h3 className="font-display text-base text-ink-950">GDPR Compliance</h3>
          <p className="text-xs text-ink-500">All data processed in EU, nothing stored</p>
        </div>
      </div>
      {retention && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-green-50 text-center">
            <p className="text-xs text-signal-green font-medium">Raw Data Stored</p>
            <p className="text-sm font-display text-ink-950 mt-1">{retention.raw_data_stored ? 'Yes' : 'No'}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-center">
            <p className="text-xs text-accent font-medium">Location</p>
            <p className="text-sm font-display text-ink-950 mt-1">{retention.processing_location}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 text-center">
            <p className="text-xs text-signal-green font-medium">Retention</p>
            <p className="text-sm font-display text-ink-950 mt-1">None</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {log?.map((entry, i) => (
          <div key={i} className="flex gap-3 text-xs">
            <span className="font-mono text-ink-400 whitespace-nowrap shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            <span className="font-mono text-accent shrink-0">{entry.action}</span>
            <span className="text-ink-600 truncate">{entry.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════

export default function App() {
  const [feedbackFile, setFeedbackFile] = useState(null)
  const [usageFile, setUsageFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('themes')
  const [prdResult, setPrdResult] = useState(null)
  const [prdLoading, setPrdLoading] = useState(false)
  const [competitorResult, setCompetitorResult] = useState(null)
  const [competitorLoading, setCompetitorLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!feedbackFile) return
    setLoading(true); setError(null); setResult(null)
    try {
      const formData = new FormData()
      formData.append('feedback_file', feedbackFile)
      if (usageFile) formData.append('usage_file', usageFile)
      const res = await fetch(`${API_BASE}/analyze/csv`, { method: 'POST', body: formData })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Failed (${res.status})`) }
      setResult(await res.json())
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleLoadSample = async () => {
    try {
      const res = await fetch(`${API_BASE}/sample-data`)
      const data = await res.json()
      const file = new File([new Blob([data.csv_content], { type: 'text/csv' })], 'sample_feedback.csv', { type: 'text/csv' })
      setFeedbackFile(file)
    } catch (err) { setError('Failed to load sample data') }
  }

  const handleGeneratePRD = async (rec) => {
    setPrdLoading(true)
    try {
      const res = await fetch(`${API_BASE}/generate/prd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_title: rec.title,
          recommendation_description: rec.description,
          reasoning: rec.reasoning,
          success_metrics: rec.success_metrics || [],
          addresses_themes: (rec.addresses_themes || []).map(String),
          effort: rec.effort, impact: rec.impact
        })
      })
      if (!res.ok) throw new Error('PRD generation failed')
      const data = await res.json()
      setPrdResult(data)
      setActiveTab('prd')
    } catch (err) { setError(err.message) }
    finally { setPrdLoading(false) }
  }

  const handleRunCompetitor = async (yourFile, compFile, compName) => {
    setCompetitorLoading(true)
    try {
      const formData = new FormData()
      formData.append('your_file', yourFile)
      formData.append('competitor_file', compFile)
      formData.append('competitor_name', compName)
      const res = await fetch(`${API_BASE}/analyze/competitor`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Competitor analysis failed')
      setCompetitorResult(await res.json())
    } catch (err) { setError(err.message) }
    finally { setCompetitorLoading(false) }
  }

  const handleExportJSON = (data) => {
    const blob = new Blob([JSON.stringify(data || result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `insightpm-${activeTab}-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setFeedbackFile(null); setUsageFile(null); setResult(null); setError(null)
    setActiveTab('themes'); setPrdResult(null); setCompetitorResult(null)
  }

  const tabs = [
    { id: 'themes', label: 'Themes', icon: BarChart3 },
    { id: 'trends', label: 'Trends', icon: Activity },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
    { id: 'competitor', label: 'Competitive', icon: Swords },
    { id: 'compliance', label: 'GDPR', icon: Shield },
  ]
  if (prdResult) tabs.splice(3, 0, { id: 'prd', label: 'PRD', icon: FileOutput })

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {!result && !loading && (
          <div className="animate-fade-in">
            <div className="text-center mb-12 mt-8">
              <h2 className="font-display text-4xl text-ink-950 mb-3">Turn feedback into<br />your next feature</h2>
              <p className="text-ink-500 max-w-lg mx-auto text-sm leading-relaxed">
                Upload customer feedback. Get AI-powered themes, trend detection, competitive intelligence, and auto-generated PRDs. GDPR-compliant.
              </p>
            </div>
            <div className="max-w-2xl mx-auto space-y-6">
              <UploadZone label="Customer Feedback (required)" description="CSV with feedback, dates, categories, ratings"
                file={feedbackFile} onFileChange={setFeedbackFile} onRemove={() => setFeedbackFile(null)} icon={Upload} />
              <UploadZone label="Product Usage Data (optional)" description="CSV with usage metrics to cross-reference"
                file={usageFile} onFileChange={setUsageFile} onRemove={() => setUsageFile(null)} icon={BarChart3} />
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-signal-red shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-signal-red">Error</p>
                    <p className="text-xs text-red-600 mt-0.5">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
                </div>
              )}
              <div className="flex items-center gap-4">
                <button onClick={handleAnalyze} disabled={!feedbackFile}
                  className="flex-1 py-3.5 px-6 rounded-xl font-medium text-sm bg-ink-950 text-white hover:bg-ink-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />Analyze Feedback
                </button>
                <button onClick={handleLoadSample}
                  className="py-3.5 px-5 rounded-xl border border-ink-200 text-sm text-ink-600 hover:bg-ink-50 transition-colors font-medium">
                  Try sample data
                </button>
              </div>
              <p className="text-center text-xs text-ink-400">
                <Lock className="w-3 h-3 inline-block mr-1" />Data anonymized before AI processing. Nothing stored.
              </p>
            </div>
          </div>
        )}

        {loading && <ProcessingState />}

        {result && !loading && (
          <div className="animate-fade-in space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink-950">{result.summary?.key_finding}</h2>
                <p className="text-sm text-ink-500 mt-1">
                  {result.themes?.length} themes · {result.recommendations?.length} recommendations
                  {result.trends?.available && !result.trends?.single_period && ` · ${result.trends.periods_analyzed} periods tracked`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleExportJSON()} className="flex items-center gap-2 py-2 px-4 rounded-xl border border-ink-200 text-sm text-ink-600 hover:bg-ink-50">
                  <Download className="w-4 h-4" />Export
                </button>
                <button onClick={handleReset} className="flex items-center gap-2 py-2 px-4 rounded-xl bg-ink-950 text-white text-sm hover:bg-ink-800">
                  New Analysis
                </button>
              </div>
            </div>

            <SummaryCards summary={result.summary} themes={result.themes || []} />

            <div className="flex gap-1 p-1 bg-ink-100 rounded-xl w-fit flex-wrap">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                  }`}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'themes' && <ThemesTab themes={result.themes} usageInsights={result.usage_insights} />}
            {activeTab === 'trends' && <TrendsTab trends={result.trends} />}
            {activeTab === 'recommendations' && <RecommendationsTab recommendations={result.recommendations} nextSteps={result.next_steps} onGeneratePRD={handleGeneratePRD} prdLoading={prdLoading} />}
            {activeTab === 'prd' && prdResult && <PRDViewer prd={prdResult} onClose={() => { setPrdResult(null); setActiveTab('recommendations') }} onExport={() => handleExportJSON(prdResult)} />}
            {activeTab === 'competitor' && <CompetitorTab onRunCompetitor={handleRunCompetitor} competitorResult={competitorResult} competitorLoading={competitorLoading} />}
            {activeTab === 'compliance' && <GDPRTab log={result.gdpr_audit_trail} retention={result.data_retention} />}
          </div>
        )}
      </main>
      <footer className="border-t border-ink-100 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-ink-400">
          <span>InsightPM v0.2.0 — AI Product Intelligence</span>
          <span>EU processing · Never stored · GDPR compliant</span>
        </div>
      </footer>
    </div>
  )
}
