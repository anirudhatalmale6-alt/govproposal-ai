import { useState, useEffect } from 'react';
import api from '../services/api';

export default function OpportunityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [form, setForm] = useState({ keywords: '', naics_codes: '', frequency_hours: 4 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchAlerts(); }, []);

  async function fetchAlerts() {
    try {
      const { data } = await api.get('/api/alerts');
      setAlerts(data.alerts || []);
    } catch (err) {
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }

  async function createAlert(e) {
    e.preventDefault();
    if (!form.keywords && !form.naics_codes) {
      setError('Enter at least keywords or NAICS codes');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await api.post('/api/alerts/create', form);
      setForm({ keywords: '', naics_codes: '', frequency_hours: 4 });
      await fetchAlerts();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create alert');
    } finally {
      setCreating(false);
    }
  }

  async function deleteAlert(id) {
    try {
      await api.delete(`/api/alerts/${id}`);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch {
      setError('Failed to delete alert');
    }
  }

  async function findMatches() {
    setMatchLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/alerts/matches');
      setMatches(data.matches || []);
    } catch (err) {
      setError('Failed to search for matches');
    } finally {
      setMatchLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opportunity Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">Get notified when new opportunities match your criteria</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Create Alert Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Alert</h2>
        <form onSubmit={createAlert} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
            <input
              type="text"
              value={form.keywords}
              onChange={e => setForm({ ...form, keywords: e.target.value })}
              placeholder="e.g., cybersecurity cloud"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NAICS Codes</label>
            <input
              type="text"
              value={form.naics_codes}
              onChange={e => setForm({ ...form, naics_codes: e.target.value })}
              placeholder="e.g., 541512, 541511"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check Every (hours)</label>
            <select
              value={form.frequency_hours}
              onChange={e => setForm({ ...form, frequency_hours: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value={1}>1 hour</option>
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={24}>24 hours</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Alert'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Alerts ({alerts.length})</h2>
          <button
            onClick={findMatches}
            disabled={matchLoading || alerts.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {matchLoading ? 'Searching...' : 'Find Matches Now'}
          </button>
        </div>

        {alerts.length === 0 ? (
          <p className="text-gray-400 text-sm">No alerts configured yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    {alert.keywords && (
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                        Keywords: {alert.keywords}
                      </span>
                    )}
                    {alert.naics_codes && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        NAICS: {alert.naics_codes}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${alert.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {alert.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Every {alert.frequency_hours}h
                    {alert.last_searched_at && ` — Last searched: ${new Date(alert.last_searched_at).toLocaleString()}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matches */}
      {matches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Matching Opportunities ({matches.length})</h2>
          <div className="space-y-3">
            {matches.map((m, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-medium text-gray-900 text-sm">{m.title || 'Untitled'}</h3>
                <p className="text-xs text-gray-500 mt-1">{m.agency || 'Unknown Agency'}</p>
                {m.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{m.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  {m.due_date && <span className="text-xs text-orange-600">Due: {m.due_date}</span>}
                  {m.matched_keywords && (
                    <span className="text-xs text-teal-600">Matched: {m.matched_keywords}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
