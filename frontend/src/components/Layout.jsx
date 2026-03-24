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
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
      { label: 'Vendor Profile', path: '/vendor-profile', icon: UserCircleIcon },
    ],
  },
  {
    label: 'Research & Analysis',
    items: [
      { label: 'Opportunities', path: '/opportunities', icon: MagnifyingGlassIcon },
      { label: 'Market Research', path: '/market-research', icon: ChartBarIcon },
      { label: 'RFP Deconstructor', path: '/rfp-deconstructor', icon: DocumentMagnifyingGlassIcon },
      { label: 'Compliance Matrix', path: '/compliance-matrix', icon: TableCellsIcon },
      { label: 'Win Probability', path: '/win-probability', icon: TrophyIcon },
    ],
  },
  {
    label: 'Proposals',
    items: [
      { label: 'New Proposal', path: '/new-proposal', icon: DocumentPlusIcon },
      { label: 'My Proposals', path: '/proposals', icon: FolderOpenIcon },
      { label: 'Templates', path: '/templates', icon: RectangleStackIcon },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Contracts', path: '/contracts', icon: BriefcaseIcon },
      { label: 'Billing', path: '/billing', icon: CreditCardIcon },
      { label: 'Audit Log', path: '/audit-log', icon: ClockIcon },
    ],
  },
];

const tierColors = {
  free: 'bg-gray-100 text-gray-600',
  paid: 'bg-accent/10 text-accent',
  pro: 'bg-blue/10 text-blue',
};

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const { user, logout } = useAuth();

  const tierLabel = user?.subscription_tier
    ? user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)
    : 'Free';
  const tierColor = tierColors[user?.subscription_tier?.toLowerCase()] || tierColors.free;

  const toggleGroup = (label) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Flatten for admin
  const allGroups = user?.is_admin
    ? [...navGroups, { label: 'Admin', items: [{ label: 'Admin Panel', path: '/admin', icon: ShieldCheckIcon }] }]
    : navGroups;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="bg-navy text-white fixed top-0 left-0 right-0 z-50 h-14">
        <div className="flex items-center justify-between h-full px-4 lg:px-5">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 no-underline text-white">
              <div className="bg-accent rounded-lg p-1.5">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                GovProposal <span className="text-accent">AI</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <>
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tierColor}`}>
                  {tierLabel}
                </span>
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent">
                      {(user.first_name || user.full_name || user.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-white/90 max-w-[120px] truncate">
                    {user.first_name || user.full_name || user.email}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  title="Logout"
                >
                  <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-56 bg-white border-r border-gray-100 z-40 transition-transform duration-300 overflow-y-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="py-3 px-3 flex flex-col h-full">
            <div className="flex-1 space-y-4">
              {allGroups.map((group) => {
                const isCollapsed = collapsedGroups[group.label];
                const hasActiveItem = group.items.some(item => location.pathname === item.path);
                return (
                  <div key={group.label}>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="flex items-center justify-between w-full px-2 mb-1 cursor-pointer group"
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${hasActiveItem ? 'text-accent' : 'text-gray-400'} group-hover:text-gray-600 transition-colors`}>
                        {group.label}
                      </span>
                      <ChevronDownIcon className={`w-3 h-3 text-gray-300 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                    {!isCollapsed && (
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all no-underline ${
                                isActive
                                  ? 'bg-navy text-white shadow-sm'
                                  : 'text-gray-500 hover:bg-gray-50 hover:text-navy'
                              }`}
                            >
                              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar footer */}
            <div className="pt-3 border-t border-gray-100 mt-3">
              {user && (
                <div className="flex items-center gap-2 px-2 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-blue flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {(user.first_name || user.full_name || user.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-navy truncate">{user.first_name || user.full_name || 'User'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
