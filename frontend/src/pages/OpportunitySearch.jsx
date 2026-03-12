import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  TagIcon,
  ArrowRightIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function OpportunitySearch() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [naicsCode, setNaicsCode] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim() && !naicsCode.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (naicsCode.trim()) params.naics = naicsCode.trim();

      const response = await api.get('/api/opportunities', { params });
      setResults(response.data.opportunities || response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to search opportunities. Please try again.'
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUseForProposal = (opportunity) => {
    navigate('/new-proposal', {
      state: {
        opportunity: {
          title: opportunity.title,
          agency: opportunity.agency,
          description: opportunity.description,
          requirements: opportunity.requirements || '',
          due_date: opportunity.due_date,
          type: opportunity.type,
          naics_code: opportunity.naics_code,
        },
      },
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Opportunity Search</h1>
        <p className="text-gray-500 mt-1">
          Search for government contract opportunities to generate proposals
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Keyword Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyword Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., cybersecurity, IT modernization, cloud services"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>

            {/* NAICS Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NAICS Code
              </label>
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={naicsCode}
                  onChange={(e) => setNaicsCode(e.target.value)}
                  placeholder="e.g., 541512, 541519"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (!keyword.trim() && !naicsCode.trim())}
            className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Searching...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-5 h-5" />
                Search Opportunities
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {searched && !loading && !error && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy">
              {results.length > 0
                ? `${results.length} Opportunities Found`
                : 'No Opportunities Found'}
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                No opportunities matched your search criteria. Try broadening your search
                terms.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((opp, index) => (
                <div
                  key={opp.id || index}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:border-blue/20"
                >
                  <div className="mb-4">
                    <h3 className="font-semibold text-navy text-base leading-snug">
                      {opp.title}
                    </h3>
                    {opp.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {opp.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BuildingLibraryIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{opp.agency || 'Unknown Agency'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CalendarDaysIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>Due: {formatDate(opp.due_date)}</span>
                    </div>
                    {opp.type && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TagIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="bg-blue/10 text-blue px-2 py-0.5 rounded-full text-xs font-medium">
                          {opp.type}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleUseForProposal(opp)}
                    className="w-full bg-navy hover:bg-navy-light text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    Use for Proposal
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial state */}
      {!searched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <MagnifyingGlassIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Search for Opportunities
          </h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Enter keywords or a NAICS code above to find government contract
            opportunities. Select an opportunity to auto-fill your proposal details.
          </p>
        </div>
      )}
    </div>
  );
}
