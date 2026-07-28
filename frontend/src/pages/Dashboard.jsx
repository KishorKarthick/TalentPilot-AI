import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI } from '../utils/api';
import Spinner from '../components/Spinner';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { BriefcaseIcon, DocumentTextIcon, UsersIcon, CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getDashboard()
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="md" wrapperClassName="flex justify-center py-20" />;

  const { overview, scoreDistribution, topSkills, hiringFunnel, recentActivity } = data || {};

  const scoreChart = {
    labels: ['0-20', '20-40', '40-60', '60-80', '80-100'],
    datasets: [{ label: 'Candidates', data: scoreDistribution?.map(s => s.count) || [], backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'], borderRadius: 6 }],
  };

  const funnelChart = {
    labels: hiringFunnel?.map(f => f._id) || [],
    datasets: [{ data: hiringFunnel?.map(f => f.count) || [], backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280'] }],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Recruitment overview at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BriefcaseIcon} label="Active Jobs" value={overview?.activeJobs} sub={`${overview?.totalJobs} total`} color="bg-primary-600" />
        <StatCard icon={DocumentTextIcon} label="Resumes" value={overview?.totalResumes} sub={`${overview?.pendingResumes} pending review`} color="bg-purple-500" />
        <StatCard icon={UsersIcon} label="Candidates" value={overview?.totalCandidates} color="bg-emerald-500" />
        <StatCard icon={CalendarIcon} label="Upcoming Interviews" value={overview?.upcomingInterviews} sub={`${overview?.totalInterviews} total`} color="bg-amber-500" />
      </div>

      {overview?.duplicateResumes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800"><strong>{overview.duplicateResumes}</strong> duplicate resumes detected and filtered automatically.</p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Match Score Distribution</h2>
          <Bar data={scoreChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Hiring Funnel</h2>
          <Doughnut data={funnelChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Top Candidate Skills</h2>
          <div className="space-y-2">
            {topSkills?.slice(0, 8).map((skill, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-28 truncate">{skill._id}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.min((skill.count / (topSkills[0]?.count || 1)) * 100, 100)}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{skill.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Uploads</h2>
          <div className="space-y-3">
            {recentActivity?.map((r) => (
              <div key={r._id} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.candidate?.name || r.originalName}</p>
                  <p className="text-xs text-gray-400">{r.job?.title || 'No job assigned'}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.matchScore >= 70 ? 'bg-success-100 text-success-700' : r.matchScore >= 40 ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700'}`}>
                    {r.matchScore}%
                  </span>
                </div>
              </div>
            ))}
            {!recentActivity?.length && <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>}
          </div>
          <Link to="/resumes/upload" className="block mt-4 text-center text-sm text-primary-600 font-medium hover:underline">Upload Resumes →</Link>
        </div>
      </div>
    </div>
  );
}
