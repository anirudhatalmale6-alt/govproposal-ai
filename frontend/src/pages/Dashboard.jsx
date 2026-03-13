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
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const quickActions = [
  {
    label: 'New Proposal',
    description: 'Generate an AI-powered proposal',
    path: '/new-proposal',
    icon: PlusIcon,
    color: 'bg-accent hover:bg-accent-dark',
  },
  {
    label: 'Search Opportunities',
    description: 'Find government contract opportunities',
    path: '/opportunities',
    icon: MagnifyingGlassIcon,
    color: 'bg-blue hover:bg-blue-light',
  },
  {
    label: 'Manage Profile',
    description: 'Update your vendor information',
    path: '/vendor-profile',
    icon: UserCircleIcon,
    color: 'bg-navy hover:bg-navy-light',
  },
];

const statusColors = {
  draft: 'text-amber-600 bg-amber-100',
  completed: 'text-accent bg-accent/10',
  in_progress: 'text-blue bg-blue/10',
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

  // Compute stats from real proposals
  const totalProposals = proposals.length;
  const completedProposals = proposals.filter(
    (p) => p.status?.toLowerCase() === 'completed'
  ).length;
  const pendingProposals = proposals.filter(
    (p) =>
      p.status?.toLowerCase() === 'draft' ||
      p.status?.toLowerCase() === 'in_progress'
  ).length;

  const stats = [
    {
      label: 'Total Proposals',
      value: totalProposals.toString(),
      icon: DocumentTextIcon,
      color: 'bg-blue',
      change: `${completedProposals} completed`,
    },
    {
      label: 'In Progress',
      value: pendingProposals.toString(),
      icon: ClockIcon,
      color: 'bg-amber-500',
      change: pendingProposals > 0 ? 'Needs attention' : 'All clear',
    },
    {
      label: 'Completed',
      value: completedProposals.toString(),
      icon: CheckCircleIcon,
      color: 'bg-accent',
      change:
        totalProposals > 0
          ? `${Math.round((completedProposals / totalProposals) * 100)}% completion rate`
          : 'Get started!',
    },
  ];

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

  const userName = user?.full_name
    ? user.full_name.split(' ')[0]
    : 'there';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">
          Welcome Back{userName !== 'there' ? `, ${userName}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your government proposals and track opportunities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-navy mt-2">
                    {loading ? (
                      <span className="inline-block w-8 h-8 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                    {stat.change}
                  </p>
                </div>
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-navy mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                className={`${action.color} text-white rounded-xl p-5 transition-all no-underline shadow-sm hover:shadow-lg hover:-translate-y-0.5`}
              >
                <Icon className="w-8 h-8 mb-3" />
                <h3 className="font-semibold text-lg">{action.label}</h3>
                <p className="text-white/80 text-sm mt-1">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Proposals Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
            <DocumentDuplicateIcon className="w-5 h-5" />
            Recent Proposals
          </h2>
          <Link
            to="/proposals"
            className="text-sm font-medium text-blue hover:text-blue-light no-underline"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <svg
                className="animate-spin w-6 h-6 text-navy mx-auto mb-2"
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
              <p className="text-sm text-gray-400">Loading proposals...</p>
            </div>
          ) : recentProposals.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                No proposals yet.{' '}
                <Link
                  to="/new-proposal"
                  className="text-blue hover:text-blue-light no-underline font-medium"
                >
                  Generate your first one
                </Link>
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Proposal
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Agency
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900 text-sm">
                          {proposal.title || 'Untitled Proposal'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {proposal.agency || '--'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusColors[proposal.status?.toLowerCase()] ||
                          statusColors.draft
                        }`}
                      >
                        {formatStatus(proposal.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 flex items-center gap-1.5">
                      <CalendarDaysIcon className="w-4 h-4" />
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
