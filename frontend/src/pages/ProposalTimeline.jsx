import { useState, useEffect } from 'react';
import api from '../services/api';

const ACTION_ICONS = {
  created_proposal: { bg: 'bg-green-100', text: 'text-green-600', icon: '+' },
  exported_pdf: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'PDF' },
  exported_docx: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'DOC' },
  shared_proposal: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'S' },
  scored_proposal: { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'SC' },
  added_comment: { bg: 'bg-teal-100', text: 'text-teal-600', icon: 'C' },
  saved_version: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: 'V' },
  login: { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'L' },
};

export default function ProposalTimeline() {
  const [activeTab, setActiveTab] = useState('team');
  const [teamTimeline, setTeamTimeline] = useState([]);
  const [proposalTimeline, setProposalTimeline] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeamTimeline();
    fetchProposals();
  }, []);

  async function fetchTeamTimeline() {
    try {
      const { data } = await api.get('/api/timeline/team');
      setTeamTimeline(data.timeline || []);
    } catch (err) {
      setError('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProposals() {
    try {
      const { data } = await api.get('/api/proposals');
      setProposals(data.proposals || []);
    } catch {}
  }

  async function fetchProposalTimeline(proposalId) {
    if (!proposalId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/timeline/proposal/${proposalId}`);
      setProposalTimeline(data.timeline || []);
    } catch (err) {
      setError('Failed to load proposal timeline');
    } finally {
      setLoading(false);
    }
  }

  function handleProposalChange(e) {
    const id = e.target.value;
    setSelectedProposal(id);
    if (id) {
      setActiveTab('proposal');
      fetchProposalTimeline(id);
    }
  }

  function getActionStyle(action) {
    return ACTION_ICONS[action] || { bg: 'bg-gray-100', text: 'text-gray-500', icon: '?' };
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  const timeline = activeTab === 'team' ? teamTimeline : proposalTimeline;

  if (loading && timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Timeline</h1>
        <p className="text-sm text-gray-500 mt-1">Track all proposal activities and team actions</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'team' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Team Activity
          </button>
          <button
            onClick={() => setActiveTab('proposal')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'proposal' ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            By Proposal
          </button>
        </div>

        {activeTab === 'proposal' && (
          <select
            value={selectedProposal}
            onChange={handleProposalChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Select a proposal...</option>
            {proposals.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {timeline.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            {activeTab === 'proposal' && !selectedProposal
              ? 'Select a proposal to view its timeline.'
              : 'No activity recorded yet.'}
          </p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />

            <div className="space-y-0">
              {timeline.map((item, idx) => {
                const style = getActionStyle(item.action);
                return (
                  <div key={item.id || idx} className="relative flex items-start gap-4 py-3">
                    {/* Icon */}
                    <div className={`relative z-10 w-10 h-10 rounded-full ${style.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs font-bold ${style.text}`}>{style.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(item.timestamp)}</span>
                      </div>
                      {item.actor && (
                        <p className="text-xs text-gray-500 mt-0.5">by {item.actor}</p>
                      )}
                      {item.proposal_title && (
                        <p className="text-xs text-teal-600 mt-0.5">{item.proposal_title}</p>
                      )}
                      {item.details && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.details}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
