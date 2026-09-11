import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon, BriefcaseIcon, DocumentArrowUpIcon,
  UsersIcon, CalendarIcon, ChartBarIcon,
  Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon,
  ShieldCheckIcon, SparklesIcon,
} from '@heroicons/react/24/outline';

const baseNavItems = [
  { to: '/dashboard', icon: HomeIcon, label: 'Dashboard', roles: ['candidate', 'recruiter', 'admin', 'hiring_manager'] },
  { to: '/jobs', icon: BriefcaseIcon, label: 'Jobs', roles: ['candidate', 'recruiter', 'admin', 'hiring_manager'] },
  { to: '/resumes/upload', icon: DocumentArrowUpIcon, label: 'Upload Resumes', roles: ['candidate', 'recruiter', 'admin'] },
  { to: '/candidates', icon: UsersIcon, label: 'Candidates', roles: ['recruiter', 'admin', 'hiring_manager'] },
  { to: '/interviews', icon: CalendarIcon, label: 'Interviews', roles: ['candidate', 'recruiter', 'admin', 'hiring_manager'] },
  { to: '/ai-interviewer', icon: SparklesIcon, label: 'AI Interviewer', roles: ['candidate', 'recruiter', 'admin', 'hiring_manager'] },
  { to: '/analytics', icon: ChartBarIcon, label: 'Analytics', roles: ['recruiter', 'admin', 'hiring_manager'] },
];

const adminNavItems = [
  { to: '/admin/users', icon: ShieldCheckIcon, label: 'User Management', roles: ['admin'] },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = [...baseNavItems, ...adminNavItems].filter(item => item.roles.includes(user?.role));

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full bg-primary-900 text-white ${mobile ? '' : 'w-64'}`}>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center font-bold text-sm">TP</div>
        <span className="font-bold text-lg">TalentPilot AI</span>
        {mobile && <button onClick={() => setSidebarOpen(false)} className="ml-auto"><XMarkIcon className="w-5 h-5" /></button>}
      </div>

      {/* Role Badge */}
      <div className="px-6 py-2 border-b border-primary-800">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${user?.role === 'admin' ? 'bg-purple-500 text-white' : user?.role === 'hiring_manager' ? 'bg-green-600 text-white' : 'bg-primary-600 text-white'}`}>
          {user?.role?.replace('_', ' ')}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Main Nav */}
        {baseNavItems.filter(i => i.roles.includes(user?.role)).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-primary-200 hover:bg-primary-800 hover:text-white'}`
            }>
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Admin</p>
            </div>
            {adminNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-purple-600 text-white' : 'text-primary-200 hover:bg-primary-800 hover:text-white'}`
                }>
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-primary-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-primary-300">{user?.company}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-primary-200 hover:text-white hover:bg-primary-800 rounded-lg transition-colors">
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden lg:flex flex-shrink-0"><Sidebar /></div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full"><Sidebar mobile /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}><Bars3Icon className="w-6 h-6" /></button>
          <span className="font-bold text-primary-900">TalentPilot AI</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
