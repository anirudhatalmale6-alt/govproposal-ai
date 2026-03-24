import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  DocumentPlusIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  ShieldCheckIcon,
  ArrowRightStartOnRectangleIcon,
  RectangleStackIcon,
  CreditCardIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  BriefcaseIcon,
  TableCellsIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { label: 'Vendor Profile', path: '/vendor-profile', icon: UserCircleIcon },
  { label: 'Opportunities', path: '/opportunities', icon: MagnifyingGlassIcon },
  { label: 'Market Research', path: '/market-research', icon: ChartBarIcon },
  { label: 'RFP Deconstructor', path: '/rfp-deconstructor', icon: DocumentMagnifyingGlassIcon },
  { label: 'Compliance Matrix', path: '/compliance-matrix', icon: TableCellsIcon },
  { label: 'Win Probability', path: '/win-probability', icon: TrophyIcon },
  { label: 'New Proposal', path: '/new-proposal', icon: DocumentPlusIcon },
  { label: 'My Proposals', path: '/proposals', icon: FolderOpenIcon },
  { label: 'Contracts', path: '/contracts', icon: BriefcaseIcon },
  { label: 'Templates', path: '/templates', icon: RectangleStackIcon },
  { label: 'Billing', path: '/billing', icon: CreditCardIcon },
  { label: 'Audit Log', path: '/audit-log', icon: ClockIcon },
];

const tierColors = {
  free: 'bg-gray-100 text-gray-600',
  paid: 'bg-accent/10 text-accent',
  pro: 'bg-blue/10 text-blue',
};

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const tierLabel = user?.subscription_tier
    ? user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)
    : 'Free';
  const tierColor = tierColors[user?.subscription_tier?.toLowerCase()] || tierColors.free;

  // Build nav items — include Admin if user is admin
  const allNavItems = user?.is_admin
    ? [...navItems, { label: 'Admin', path: '/admin', icon: ShieldCheckIcon }]
    : navItems;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-navy text-white shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 rounded-md hover:bg-navy-light transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2.5 no-underline text-white">
              <div className="bg-accent rounded-lg p-1.5">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                GovProposal <span className="text-accent">AI</span>
              </span>
            </Link>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all no-underline ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span
                  className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tierColor}`}
                >
                  {tierLabel}
                </span>
                <span className="hidden sm:block text-sm text-white/80 max-w-[150px] truncate">
                  {user.full_name || user.email}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  title="Logout"
                >
                  <ArrowRightStartOnRectangleIcon className="w-4.5 h-4.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Layout body */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 shadow-sm z-40 transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="p-4 space-y-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all no-underline ${
                    isActive
                      ? 'bg-navy text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-navy'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer — user info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            {user ? (
              <div className="bg-blue/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-navy truncate">
                    {user.full_name || 'User'}
                  </p>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${tierColor}`}
                  >
                    {tierLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            ) : (
              <div className="bg-blue/5 rounded-lg p-3">
                <p className="text-xs font-semibold text-navy mb-1">GovProposal AI</p>
                <p className="text-xs text-gray-500">
                  AI-powered government proposal generation
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] lg:ml-0 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
