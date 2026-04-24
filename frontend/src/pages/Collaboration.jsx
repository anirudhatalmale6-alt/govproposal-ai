import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Collaboration() {
  const [proposals, setProposals] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [comments, setComments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sectionKey, setSectionKey] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/proposals').then(res => {
      setProposals(res.data.proposals || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadComments();
      loadVersions();
    }
  }, [selectedId]);

  const loadComments = async () => {
    try {
      const res = await api.get(`/api/proposals/${selectedId}/comments`);
      setComments(res.data.comments || []);
    } catch {
      setComments([]);
    }
  };

  const loadVersions = async () => {
    try {
      const res = await api.get(`/api/proposals/${selectedId}/versions`);
      setVersions(res.data.versions || []);
    } catch {
      setVersions([]);
    }
  };

  const handleAddComment = async () => {
    if (!selectedId || !newComment.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/api/proposals/${selectedId}/comments`, {
        content: newComment,
        section_key: sectionKey || null,
      });
      setNewComment('');
      setSectionKey('');
      loadComments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.post(`/api/proposals/${selectedId}/versions`, {
        change_summary: 'Manual version save',
      });
      loadVersions();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save version');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const selectedProposal = proposals.find(p => p.id === selectedId);
  const sectionKeys = selectedProposal ? Object.keys(selectedProposal.sections || {}) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Collaboration</h1>
        <p className="text-gray-500 text-sm mt-1">Comments, version history, and team coordination</p>
      </div>

      {/* Proposal selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a proposal...</option>
          {proposals.map(p => (
            <option key={p.id} value={p.id}>{p.title || p.opportunity_title}</option>
          ))}
        </select>
      </div>

      {selectedId && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['comments', 'versions'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'comments' ? `Comments (${comments.length})` : `Versions (${versions.length})`}
              </button>
            ))}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Add comment */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Comment</h3>
                <div className="space-y-3">
                  <select
                    value={sectionKey}
                    onChange={e => setSectionKey(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">General comment (no specific section)</option>
                    {sectionKeys.map(k => (
                      <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write your comment..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={loading || !newComment.trim()}
                    className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <p className="text-gray-400 text-sm">No comments yet. Be the first to add one.</p>
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-navy">
                            {(c.user_name || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{c.user_name}</span>
                        <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                        {c.section_key && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                            {c.section_key.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 pl-9">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Versions Tab */}
          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={handleSaveVersion}
                  disabled={loading}
                  className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Current Version'}
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {versions.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-400 text-sm">No saved versions yet.</p>
                  </div>
                ) : (
                  versions.map((v, i) => (
                    <div key={v.id || i} className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        v.version === 'current' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {v.version === 'current' ? 'C' : `v${v.version_number}`}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {v.version === 'current' ? 'Current Version' : `Version ${v.version_number}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {v.change_summary || v.status || ''}
                          {' — '}
                          {formatDate(v.created_at || v.updated_at)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {v.sections_count || 0} sections
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
