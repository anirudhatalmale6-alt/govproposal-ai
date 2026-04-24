import { useState, useEffect } from 'react';
import api from '../services/api';

const gradeColors = {
  A: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  B: 'text-blue-600 bg-blue-50 border-blue-200',
  C: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  D: 'text-orange-600 bg-orange-50 border-orange-200',
  F: 'text-red-600 bg-red-50 border-red-200',
};

const priorityColors = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export default function ProposalScoring() {
  const [proposals, setProposals] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [scoreData, setScoreData] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/proposals').then(res => {
      setProposals(res.data.proposals || []);
    }).catch(() => {});
  }, []);

  const handleScore = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    setScoreData(null);
    setFeedback(null);
    try {
      const res = await api.post(`/api/proposals/${selectedId}/score`);
      setScoreData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async () => {
    if (!selectedId || !scoreData) return;
    setFeedbackLoading(true);
    try {
      const res = await api.get(`/api/proposals/${selectedId}/feedback`);
      setFeedback(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const ScoreRing = ({ score, size = 120 }) => {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          className="text-2xl font-bold fill-gray-800" transform={`rotate(90, ${size/2}, ${size/2})`}>
          {score}
        </text>
      </svg>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proposal Scoring</h1>
        <p className="text-gray-500 text-sm mt-1">AI-powered scoring and feedback for your proposals</p>
      </div>

      {/* Proposal selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Select Proposal to Score</h2>
        <div className="flex gap-3">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a proposal...</option>
            {proposals.map(p => (
              <option key={p.id} value={p.id}>{p.title || p.opportunity_title}</option>
            ))}
          </select>
          <button
            onClick={handleScore}
            disabled={!selectedId || loading}
            className="px-5 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Scoring...' : 'Score Proposal'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Score Results */}
      {scoreData && (
        <div className="space-y-6">
          {/* Overall score card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-8">
              <ScoreRing score={scoreData.overall_score} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">Overall Score</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${gradeColors[scoreData.grade] || gradeColors.F}`}>
                    Grade: {scoreData.grade}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{scoreData.proposal_title}</p>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(scoreData.category_scores || {}).map(([cat, data]) => (
              <div key={cat} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 capitalize">{cat.replace('_', ' ')}</h3>
                  <span className="text-lg font-bold text-gray-900">{data.score ?? data.average ?? 0}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${data.score ?? data.average ?? 0}%`,
                      backgroundColor: (data.score ?? data.average ?? 0) >= 70 ? '#10b981' : (data.score ?? data.average ?? 0) >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                {data.details && Array.isArray(data.details) && data.details.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {data.details.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-xs text-gray-500">- {d}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {scoreData.recommendations && scoreData.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {scoreData.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[rec.priority] || priorityColors.medium}`}>
                      {rec.priority}
                    </span>
                    <p className="text-sm text-gray-700">{rec.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback button */}
          <div className="flex justify-center">
            <button
              onClick={handleFeedback}
              disabled={feedbackLoading}
              className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {feedbackLoading ? 'Loading Feedback...' : 'Get Detailed AI Feedback'}
            </button>
          </div>

          {/* AI Feedback */}
          {feedback && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Detailed Feedback</h3>

              {/* Section feedback */}
              {feedback.section_feedback && feedback.section_feedback.length > 0 && (
                <div className="space-y-3 mb-6">
                  {feedback.section_feedback.map((sf, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-800">{sf.section}</span>
                        <span className="text-xs text-gray-400">{sf.word_count} words</span>
                      </div>
                      {sf.strengths?.map((s, j) => (
                        <p key={j} className="text-xs text-emerald-600 mt-1">+ {s}</p>
                      ))}
                      {sf.issues?.map((s, j) => (
                        <p key={j} className="text-xs text-red-600 mt-1">- {s}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* AI feedback text */}
              {feedback.ai_detailed_feedback && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">AI Analysis</h4>
                  <p className="text-sm text-blue-700 whitespace-pre-line">{feedback.ai_detailed_feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
