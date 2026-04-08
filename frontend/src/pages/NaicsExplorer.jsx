import { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  ShieldCheckIcon,
  TruckIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const categories = [
  'All',
  'IT & Technology',
  'Consulting',
  'Cybersecurity',
  'Construction',
  'Healthcare',
  'R&D',
];

const categoryColors = {
  'IT & Technology': 'bg-blue/10 text-blue',
  Consulting: 'bg-purple-100 text-purple-700',
  Cybersecurity: 'bg-red-50 text-red-700',
  Construction: 'bg-amber-50 text-amber-700',
  Healthcare: 'bg-emerald-50 text-emerald-700',
  'R&D': 'bg-cyan-50 text-cyan-700',
};

const priorityColors = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function NaicsExplorer() {
  const [naicsCodes, setNaicsCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCode, setExpandedCode] = useState(null);
  const [codeDetails, setCodeDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(null);
  const [addingNaics, setAddingNaics] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  useEffect(() => {
    fetchNaicsCodes();
  }, [activeCategory]);

  const fetchNaicsCodes = async () => {
    try {
      setLoading(true);
      const params = activeCategory !== 'All' ? { category: activeCategory } : {};
      const res = await api.get('/api/compliance/naics', { params });
      setNaicsCodes(res.data?.naics_codes || res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load NAICS codes');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (code) => {
    if (codeDetails[code]) return;
    try {
      setDetailLoading(code);
      const res = await api.get(`/api/compliance/naics/${code}`);
      setCodeDetails((prev) => ({ ...prev, [code]: res.data }));
    } catch {
      // silently fail
    } finally {
      setDetailLoading(null);
    }
  };

  const handleExpand = (code) => {
    if (expandedCode === code) {
      setExpandedCode(null);
    } else {
      setExpandedCode(code);
      fetchDetails(code);
    }
  };

  const handleAddToCompany = async (naicsId) => {
    try {
      setAddingNaics(naicsId);
      await api.post('/api/compliance/company/naics', { naics_id: naicsId, is_primary: false });
      setAddSuccess(naicsId);
      setTimeout(() => setAddSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add NAICS code');
    } finally {
      setAddingNaics(null);
    }
  };

  const filteredCodes = useMemo(() => {
    if (!search.trim()) return naicsCodes;
    const s = search.toLowerCase();
    return naicsCodes.filter(
      (n) =>
        n.code?.toLowerCase().includes(s) ||
        n.title?.toLowerCase().includes(s) ||
        n.description?.toLowerCase().includes(s)
    );
  }, [naicsCodes, search]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">NAICS Explorer</h1>
        <p className="text-gray-500 mt-1">Browse and search NAICS codes with compliance requirements</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-600 underline mt-1 cursor-pointer">Dismiss</button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code number, title, or keyword..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all bg-white"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeCategory === cat
                ? 'bg-navy text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-400 mb-4">{filteredCodes.length} NAICS codes found</p>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-navy" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No NAICS codes match your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCodes.map((naics) => {
            const isExpanded = expandedCode === naics.code;
            const details = codeDetails[naics.code];
            const catColor = categoryColors[naics.category] || 'bg-gray-100 text-gray-600';

            return (
              <div key={naics.code} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                {/* Card Header */}
                <button
                  onClick={() => handleExpand(naics.code)}
                  className="w-full flex items-center gap-4 p-5 text-left cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-navy text-lg">{naics.code}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${catColor}`}>
                        {naics.category || 'General'}
                      </span>
                      {naics.requirement_count !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-navy/5 text-navy">
                          <ShieldCheckIcon className="w-3 h-3" />
                          {naics.requirement_count} requirements
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{naics.title}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50/30">
                    {detailLoading === naics.code ? (
                      <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : details ? (
                      <div className="space-y-6">
                        {/* Description */}
                        {details.description && (
                          <div>
                            <h3 className="text-sm font-semibold text-navy mb-2">Description</h3>
                            <p className="text-sm text-gray-600">{details.description}</p>
                          </div>
                        )}

                        {/* Required Compliance */}
                        {details.requirements?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-navy mb-2 flex items-center gap-2">
                              <ShieldCheckIcon className="w-4 h-4" />
                              Required Compliance ({details.requirements.length})
                            </h3>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Name</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Category</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Priority</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Mandatory</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.requirements.map((req, i) => (
                                    <tr key={i} className="border-b border-gray-100 last:border-0">
                                      <td className="px-3 py-2 text-sm text-gray-700">{req.name}</td>
                                      <td className="px-3 py-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600">
                                          {req.category}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${priorityColors[req.priority?.toLowerCase()] || priorityColors.low}`}>
                                          {req.priority || 'Low'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        {req.mandatory ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-700">Required</span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-500">Optional</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Eligible Contract Vehicles */}
                        {details.contract_vehicles?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-navy mb-2 flex items-center gap-2">
                              <TruckIcon className="w-4 h-4" />
                              Eligible Contract Vehicles ({details.contract_vehicles.length})
                            </h3>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Name</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Type</th>
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Relevance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.contract_vehicles.map((v, i) => (
                                    <tr key={i} className="border-b border-gray-100 last:border-0">
                                      <td className="px-3 py-2 text-sm text-gray-700 font-medium">{v.name}</td>
                                      <td className="px-3 py-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue/10 text-blue">
                                          {v.type}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(v.relevance_score || 0) * 100}%` }} />
                                          </div>
                                          <span className="text-xs text-gray-500">{Math.round((v.relevance_score || 0) * 100)}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Add to Company Button */}
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleAddToCompany(naics.id || naics.code)}
                            disabled={addingNaics === (naics.id || naics.code)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light transition-colors cursor-pointer disabled:opacity-60"
                          >
                            {addSuccess === (naics.id || naics.code) ? (
                              <>
                                <CheckCircleIcon className="w-4 h-4" />
                                Added!
                              </>
                            ) : (
                              <>
                                <PlusIcon className="w-4 h-4" />
                                {addingNaics === (naics.id || naics.code) ? 'Adding...' : 'Add to My Company'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">No details available</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
