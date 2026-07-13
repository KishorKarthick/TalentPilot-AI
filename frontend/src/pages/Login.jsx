import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheckIcon, BriefcaseIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const ROLES = [
  {
    key: 'recruiter',
    label: 'Recruiter',
    description: 'Post jobs & manage resumes',
    icon: BriefcaseIcon,
    color: 'border-primary-500 bg-primary-50 text-primary-700',
    activeRing: 'ring-2 ring-primary-500',
  },
  {
    key: 'hiring_manager',
    label: 'Hiring Manager',
    description: 'Review candidates & interviews',
    icon: UserGroupIcon,
    color: 'border-green-500 bg-green-50 text-green-700',
    activeRing: 'ring-2 ring-green-500',
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Full platform access',
    icon: ShieldCheckIcon,
    color: 'border-purple-500 bg-purple-50 text-purple-700',
    activeRing: 'ring-2 ring-purple-500',
  },
];

const WELCOME = {
  recruiter: 'Welcome back, Recruiter!',
  hiring_manager: 'Welcome back, Hiring Manager!',
  admin: 'Welcome back, Admin!',
};

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [selectedRole, setSelectedRole] = useState('recruiter');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form);
      // Verify the role matches what was selected
      if (user.role !== selectedRole) {
        toast.error(`This account is registered as "${user.role.replace('_', ' ')}". Please select the correct role.`);
        setLoading(false);
        return;
      }
      toast.success(WELCOME[user.role] || 'Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const activeRole = ROLES.find(r => r.key === selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* Logo */}
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
            <span className="text-white font-bold text-2xl">TP</span>
          </div>
          <h1 className="text-3xl font-bold text-white">TalentPilot AI</h1>
          <p className="text-primary-200 mt-1 text-sm">Your AI Hiring Intelligence Platform.</p>
        </div>

        {/* Role Selector */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
          <p className="text-white/70 text-xs font-medium text-center mb-3 uppercase tracking-wider">Sign in as</p>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(({ key, label, description, icon: Icon, color, activeRing }) => (
              <button key={key} type="button" onClick={() => setSelectedRole(key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${selectedRole === key ? `${color} ${activeRing}` : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{label}</span>
                <span className={`text-xs text-center leading-tight hidden sm:block ${selectedRole === key ? 'opacity-70' : 'opacity-40'}`}>{description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            {activeRole && <activeRole.icon className="w-5 h-5 text-gray-400" />}
            <h2 className="text-lg font-bold text-gray-900">
              {selectedRole === 'admin' ? 'Admin Portal' : selectedRole === 'hiring_manager' ? 'Hiring Manager Portal' : 'Recruiter Portal'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className={`w-full text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 ${
                selectedRole === 'admin' ? 'bg-purple-600 hover:bg-purple-700' :
                selectedRole === 'hiring_manager' ? 'bg-green-600 hover:bg-green-700' :
                'bg-primary-600 hover:bg-primary-700'
              }`}>
              {loading ? 'Signing in...' : `Sign in as ${ROLES.find(r => r.key === selectedRole)?.label}`}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
