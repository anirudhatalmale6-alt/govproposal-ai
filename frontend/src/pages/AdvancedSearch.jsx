import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdvancedSearch() {
  const [activeTab, setActiveTab] = useState('proposals');
  const [proposalResults, setProposalResults] = useState([]);
  const [opportunityResults, setOpportunityResults] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [proposalForm, setProposalForm] = useState({ query: '', status: '', limit: 20 });
  const [oppForm, setOppForm] = useState({ keyword: '', naics_code: '', agency: '', limit: 25 });

  useEffect(() => { fetchSaved(); }, []);

  async function fetchSaved() {
    try {
      const { data } = await api.get('/api/search/saved');
      setSavedSearches(data.saved_searches || []);
    } catch {}
  }

  async function searchProposals(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/search/proposals', proposalForm);
      setProposalResults(data.proposals || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function searchOpportunities(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/search/opportunities', oppForm);
      setOpportunityResults(data.opportunities || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function saveCurrentSearch() {
    const params = activeTab === 'proposals' ? proposalForm : oppForm;
    const name = prompt('Name this search:');
    if (!name) return;
    try {
      await api.post('/api/search/save', { name, search_type: activeTab, params });
      await fetchSaved();
    } catch {}
  }

  async function deleteSaved(id) {
    try {
      await api.delete(`/api/search/saved/${id}`);
      setSavedSearches(savedSearches.filter(s => s.id !== id));
    } catch {}
  }

  function loadSavedSearch(saved) {
    if (saved.search_type === 'proposals') {
      setActiveTab('proposals');
      setProposalForm({ ...proposalForm, ...saved.params });
    } else {
      setActiveTab('opportunities');
      setOppForm({ ...oppForm, ...saved.params });
    }
  }

  const tabs = [
    { key: 'proposals', label: 'My Proposals' },
    { key: 'opportunities', label: 'SAM.gov Opportunities' },
    { key: 'saved', label: `Saved (${savedSearches.length})` },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advanced Search</h1>
        <p className="text-sm text-gray-500 mt-1">Search across proposals and federal opportunities</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-500 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Proposal Search */}
      {activeTab === 'proposals' && (
        <div className="space-y-4">
          <form onSubmit={searchProposals} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
                <input
                  type="text"
                  value={proposalForm.query}
                  onChange={e => setProposalForm({ ...proposalForm, query: e.target.value })}
                  placeholder="Search proposal titles, agencies, descriptions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={proposalForm.status}
                  onChange={e => setProposalForm({ ...proposalForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">All</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Searching...' : 'Search Proposals'}
              </button>
              <button
                type="button"
                onClick={saveCurrentSearch}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Save Search
              </button>
            </div>
          </form>

          {proposalResults.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Results ({proposalResults.length})</h3>
              <div className="space-y-3">
                {proposalResults.map(p => (
                  <div key={p.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-teal-200 transition-colors">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 text-sm">{p.title}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        p.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>{p.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{p.opportunity_agency}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Opportunity Search */}
      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          <form onSubmit={searchOpportunities} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
                <input
                  type="text"
                  value={oppForm.keyword}
                  onChange={e => setOppForm({ ...oppForm, keyword: e.target.value })}
                  placeholder="e.g., IT modernization"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NAICS Code</label>
                <input
                  type="text"
                  value={oppForm.naics_code}
                  onChange={e => setOppForm({ ...oppForm, naics_code: e.target.value })}
                  placeholder="e.g., 541512"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency</label>
                <input
                  type="text"
                  value={oppForm.agency}
                  onChange={e => setOppForm({ ...oppForm, agency: e.target.value })}
                  placeholder="e.g., Department of Defense"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Searching...' : 'Search Opportunities'}
              </button>
              <button
                type="button"
                onClick={saveCurrentSearch}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Save Search
              </button>
            </div>
          </form>

          {opportunityResults.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Results ({opportunityResults.length})</h3>
              <div className="space-y-3">
                {opportunityResults.map((opp, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <h4 className="font-medium text-gray-900 text-sm">{opp.title || 'Untitled'}</h4>
                    <p className="text-xs text-gray-500 mt-1">{opp.agency || 'Unknown Agency'}</p>
                    {opp.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{opp.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      {opp.due_date && <span className="text-xs text-orange-600">Due: {opp.due_date}</span>}
                      {opp.naics_code && <span className="text-xs text-blue-600">NAICS: {opp.naics_code}</span>}
                      <span className="text-xs text-gray-400">{opp.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Searches */}
      {activeTab === 'saved' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Searches</h3>
          {savedSearches.length === 0 ? (
            <p className="text-gray-400 text-sm">No saved searches. Run a search and save it for quick access.</p>
          ) : (
            <div className="space-y-3">
              {savedSearches.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">{s.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Type: {s.search_type} — Saved {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadSavedSearch(s)}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteSaved(s.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
