import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowTrendingUpIcon,
  DocumentDuplicateIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusColors = {
  draft: 'text-amber-600 bg-amber-50',
  completed: 'text-emerald-600 bg-emerald-50',
  in_progress: 'text-blue bg-blue/5',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await api.get('/api/proposals');
      const data = response.data?.proposals || response.data || [];
      setProposals(data);
    } catch {
      // Silently fail — dashboard will show zeroes
    } finally {
      setLoading(false);
    }
  };

  const totalProposals = proposals.length;
  const completedProposals = proposals.filter(
    (p) => p.status?.toLowerCase() === 'completed'
  ).length;
  const pendingProposals = proposals.filter(
    (p) =>
      p.status?.toLowerCase() === 'draft' ||
      p.status?.toLowerCase() === 'in_progress'
  ).length;

  const recentProposals = proposals.slice(0, 5);

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
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

  const formatStatus = (status) => {
    if (!status) return 'Draft';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const userName = user?.first_name || (user?.full_name ? user.full_name.split(' ')[0] : '');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy to-navy-light rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="150" cy="50" r="80" fill="white" />
            <circle cx="180" cy="120" r="60" fill="white" />
          </svg>
        </div>
        <div className="relative">
          <p className="text-white/60 text-sm font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold mt-1">
            {userName ? `Welcome back, ${userName}` : 'Welcome back'}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {totalProposals === 0
              ? 'Ready to create your first proposal?'
              : `You have ${pendingProposals} proposal${pendingProposals !== 1 ? 's' : ''} in progress`}
          </p>
          <Link
            to="/new-proposal"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium text-white no-underline transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Proposal
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue/10 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-blue" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? <span className="inline-block w-6 h-6 bg-gray-100 rounded animate-pulse" /> : totalProposals}
          </p>
          <p className="text-xs text-gray-400 mt-1">Proposals created</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? <span className="inline-block w-6 h-6 bg-gray-100 rounded animate-pulse" /> : pendingProposals}
          </p>
          <p className="text-xs text-gray-400 mt-1">In progress</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xs text-gray-400 font-medium">Done</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? <span className="inline-block w-6 h-6 bg-gray-100 rounded animate-pulse" /> : completedProposals}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalProposals > 0
              ? `${Math.round((completedProposals / totalProposals) * 100)}% completion`
              : 'Get started'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/new-proposal"
          className="group bg-white rounded-xl border border-gray-100 p-5 no-underline hover:border-accent/30 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/15 transition-colors">
            <SparklesIcon className="w-5 h-5 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Generate Proposal</h3>
          <p className="text-xs text-gray-400 mt-1">AI-powered proposal creation</p>
        </Link>

        <Link
          to="/opportunities"
          className="group bg-white rounded-xl border border-gray-100 p-5 no-underline hover:border-blue/30 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center mb-3 group-hover:bg-blue/15 transition-colors">
            <MagnifyingGlassIcon className="w-5 h-5 text-blue" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Find Opportunities</h3>
          <p className="text-xs text-gray-400 mt-1">Search government contracts</p>
        </Link>

        <Link
          to="/vendor-profile"
          className="group bg-white rounded-xl border border-gray-100 p-5 no-underline hover:border-navy/30 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center mb-3 group-hover:bg-navy/15 transition-colors">
            <UserCircleIcon className="w-5 h-5 text-navy" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Vendor Profile</h3>
          <p className="text-xs text-gray-400 mt-1">Update your company info</p>
        </Link>
      </div>

      {/* Recent Proposals */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <DocumentDuplicateIcon className="w-4 h-4 text-gray-400" />
            Recent Proposals
          </h2>
          <Link
            to="/proposals"
            className="text-xs font-medium text-blue hover:text-blue-light no-underline flex items-center gap-1"
          >
            View all
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <svg className="animate-spin w-5 h-5 text-gray-300 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-gray-400">Loading...</p>
            </div>
          ) : recentProposals.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <RocketLaunchIcon className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">No proposals yet</p>
              <p className="text-xs text-gray-400 mb-3">Create your first AI-powered government proposal</p>
              <Link
                to="/new-proposal"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium no-underline hover:bg-accent-dark transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                New Proposal
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">
                    Proposal
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">
                    Agency
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">
                    Status
                  </th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900 text-sm">
                        {proposal.title || 'Untitled Proposal'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {proposal.agency || '--'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          statusColors[proposal.status?.toLowerCase()] || statusColors.draft
                        }`}
                      >
                        {formatStatus(proposal.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {formatDate(proposal.created_at || proposal.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
