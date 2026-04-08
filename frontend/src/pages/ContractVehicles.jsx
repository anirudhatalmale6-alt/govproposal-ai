import { useState, useEffect } from 'react';
import {
  TruckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  TagIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const typeColors = {
  GWAC: 'bg-blue/10 text-blue',
  IDIQ: 'bg-purple-100 text-purple-700',
  BPA: 'bg-amber-50 text-amber-700',
  GSA: 'bg-emerald-50 text-emerald-700',
};

export default function ContractVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/compliance/vehicles');
      setVehicles(res.data?.vehicles || res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load contract vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id) => {
    if (details[id]) return;
    try {
      setDetailLoading(id);
      const res = await api.get(`/api/compliance/vehicles/${id}`);
      setDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch {
      // silently fail
    } finally {
      setDetailLoading(null);
    }
  };

  const handleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchDetails(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Contract Vehicles</h1>
        <p className="text-gray-500 mt-1">Explore government contract vehicles and their requirements</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-navy" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <TruckIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No contract vehicles available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {vehicles.map((vehicle) => {
            const isExpanded = expandedId === vehicle.id;
            const detail = details[vehicle.id];
            const tColor = typeColors[vehicle.type?.toUpperCase()] || 'bg-gray-100 text-gray-600';

            return (
              <div key={vehicle.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-navy mb-1">{vehicle.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${tColor}`}>
                          {vehicle.type}
                        </span>
                        {vehicle.agency && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <BuildingOffice2Icon className="w-3 h-3" />
                            {vehicle.agency}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-navy/5 rounded-lg p-2.5 flex-shrink-0">
                      <TruckIcon className="w-5 h-5 text-navy" />
                    </div>
                  </div>

                  {vehicle.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{vehicle.description}</p>
                  )}

                  {/* Required Compliance Summary */}
                  {vehicle.required_compliance?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Required Compliance</p>
                      <div className="flex flex-wrap gap-1">
                        {vehicle.required_compliance.slice(0, 4).map((rc, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-navy/5 text-navy">
                            <ShieldCheckIcon className="w-3 h-3" />
                            {rc.name || rc}
                          </span>
                        ))}
                        {vehicle.required_compliance.length > 4 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                            +{vehicle.required_compliance.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Eligible NAICS Summary */}
                  {vehicle.eligible_naics?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Eligible NAICS</p>
                      <div className="flex flex-wrap gap-1">
                        {vehicle.eligible_naics.slice(0, 6).map((n, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue/5 text-blue">
                            {n.code || n}
                          </span>
                        ))}
                        {vehicle.eligible_naics.length > 6 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                            +{vehicle.eligible_naics.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expand Button */}
                  <button
                    onClick={() => handleExpand(vehicle.id)}
                    className="flex items-center gap-1 text-xs font-medium text-blue hover:text-blue-light transition-colors cursor-pointer mt-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUpIcon className="w-3.5 h-3.5" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                        View Details
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50/30">
                    {detailLoading === vehicle.id ? (
                      <div className="flex items-center justify-center py-6">
                        <svg className="animate-spin w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : detail ? (
                      <div className="space-y-4">
                        {detail.full_description && (
                          <div>
                            <h4 className="text-sm font-semibold text-navy mb-1">Full Description</h4>
                            <p className="text-sm text-gray-600">{detail.full_description}</p>
                          </div>
                        )}

                        {detail.requirements?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-navy mb-2">All Required Compliance</h4>
                            <div className="space-y-1.5">
                              {detail.requirements.map((r, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100">
                                  <ShieldCheckIcon className="w-4 h-4 text-navy flex-shrink-0" />
                                  <span className="text-sm text-gray-700 flex-1">{r.name || r}</span>
                                  {r.category && (
                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{r.category}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detail.naics_codes?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-navy mb-2">All Eligible NAICS Codes</h4>
                            <div className="grid grid-cols-2 gap-1.5">
                              {detail.naics_codes.map((n, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100">
                                  <span className="font-mono font-bold text-navy text-xs">{n.code || n}</span>
                                  {n.title && <span className="text-xs text-gray-500 truncate">{n.title}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detail.website && (
                          <div>
                            <h4 className="text-sm font-semibold text-navy mb-1">Website</h4>
                            <a href={detail.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue hover:text-blue-light">
                              {detail.website}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">No additional details available</p>
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
