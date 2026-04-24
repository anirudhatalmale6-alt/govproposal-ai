import { useState, useEffect } from 'react';
import api from '../services/api';

const statCard = (label, value, sub, color = 'navy') => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
    <p className={`text-2xl font-bold mt-1 text-${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState('win-rate');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'win-rate', label: 'Win Rate' },
    { id: 'pipeline-value', label: 'Pipeline Value' },
    { id: 'response-time', label: 'Response Time' },
    { id: 'team-performance', label: 'Performance' },
  ];

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const loadData = async (tab) => {
    setLoading(true);
    setData(null);
    try {
      const res = await api.get(`/api/analytics/${tab}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (v) => {
    if (!v && v !== 0) return '$0';
    return `$${Number(v).toLocaleString()}`;
  };

  const BarChart = ({ items, labelKey, valueKey, maxValue }) => {
    const max = maxValue || Math.max(...items.map(i => i[valueKey] || 0), 1);
    return (
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-28 truncate">{item[labelKey]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4">
              <div
                className="bg-navy/80 h-4 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(2, ((item[valueKey] || 0) / max) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-16 text-right">
              {typeof item[valueKey] === 'number' && item[valueKey] > 999
                ? formatMoney(item[valueKey])
                : item[valueKey]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Insights into proposal performance, pipeline, and team activity</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-navy border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading analytics...</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Win Rate Tab */}
          {activeTab === 'win-rate' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCard('Total Proposals', data.total_proposals)}
                {statCard('Win Rate', `${data.win_rate}%`, `${data.decisions?.won || 0} won / ${data.decisions?.lost || 0} lost`)}
                {statCard('Completion Rate', `${data.completion_rate}%`)}
                {statCard('Pending', data.decisions?.pending || 0)}
              </div>

              {/* Status breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.status_breakdown || {}).map(([status, count]) => (
                    <div key={status} className="px-4 py-2 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400 capitalize">{status}</p>
                      <p className="text-lg font-bold text-gray-800">{count}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly trend */}
              {data.monthly_trend && data.monthly_trend.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trend</h3>
                  <BarChart items={data.monthly_trend} labelKey="month" valueKey="created" />
                </div>
              )}
            </div>
          )}

          {/* Pipeline Value Tab */}
          {activeTab === 'pipeline-value' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCard('Total Value', formatMoney(data.total_contract_value))}
                {statCard('Active Value', formatMoney(data.active_value))}
                {statCard('Completed', formatMoney(data.completed_value))}
                {statCard('Contracts', data.total_contracts)}
              </div>

              {data.top_agencies && data.top_agencies.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Agencies by Value</h3>
                  <BarChart items={data.top_agencies} labelKey="agency" valueKey="value" />
                </div>
              )}

              {data.value_by_status && Object.keys(data.value_by_status).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Value by Status</h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(data.value_by_status).map(([status, val]) => (
                      <div key={status} className="px-4 py-2 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-400 capitalize">{status}</p>
                        <p className="text-lg font-bold text-gray-800">{formatMoney(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Response Time Tab */}
          {activeTab === 'response-time' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCard('Avg Response', `${data.average_hours}h`, 'hours to complete')}
                {statCard('Completed', data.total_completed, 'proposals scored')}
                {statCard('Last 30 Days', data.recent_30_days?.proposals_created || 0, 'created')}
                {statCard('Fastest', data.fastest ? `${data.fastest.hours}h` : 'N/A')}
              </div>

              {data.all_response_times && data.all_response_times.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Response Times</h3>
                  <div className="space-y-2">
                    {data.all_response_times.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700 truncate flex-1">{r.title}</span>
                        <span className="text-sm font-medium text-navy ml-4">{r.hours}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Team Performance Tab */}
          {activeTab === 'team-performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCard('Proposals', data.totals?.proposals || 0)}
                {statCard('Contracts', data.totals?.contracts || 0)}
                {statCard('Comments', data.totals?.comments || 0)}
                {statCard('Actions', data.totals?.audit_actions || 0)}
              </div>

              {data.action_breakdown && Object.keys(data.action_breakdown).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity Breakdown</h3>
                  <BarChart
                    items={Object.entries(data.action_breakdown).map(([k, v]) => ({ action: k.replace(/_/g, ' '), count: v }))}
                    labelKey="action"
                    valueKey="count"
                  />
                </div>
              )}

              {data.activity_trend && data.activity_trend.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">14-Day Activity Trend</h3>
                  <div className="flex items-end gap-1 h-32">
                    {data.activity_trend.map((d, i) => {
                      const max = Math.max(...data.activity_trend.map(t => t.actions), 1);
                      const h = Math.max(4, (d.actions / max) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-navy/70 rounded-t transition-all"
                            style={{ height: `${h}%` }}
                            title={`${d.date}: ${d.actions} actions`}
                          />
                          <span className="text-[9px] text-gray-400">{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
