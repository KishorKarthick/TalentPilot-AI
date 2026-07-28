import { useEffect, useState } from 'react';
import { analyticsAPI, jobsAPI } from '../utils/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import toast from 'react-hot-toast';
import ErrorState from '../components/ErrorState';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

export default function Analytics() {
  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([analyticsAPI.getDashboard(), jobsAPI.getAll({ limit: 100 })])
      .then(([dash, j]) => { setData(dash.data); setJobs(j.data); })
      .catch((err) => setError(err.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!selectedJob) return setJobData(null);
    analyticsAPI.getJobAnalytics(selectedJob)
      .then(r => setJobData(r.data))
      .catch((err) => {
        setJobData(null);
        toast.error(err.message || 'Failed to load job analytics');
      });
  }, [selectedJob]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const { overview, scoreDistribution, topSkills, hiringFunnel } = data || {};

  const scoreChart = {
    labels: ['0-20', '20-40', '40-60', '60-80', '80-100'],
    datasets: [{
      label: 'Candidates',
      data: scoreDistribution?.map(s => s.count) || [],
      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'],
      borderRadius: 8,
    }],
  };

  const skillsChart = {
    labels: topSkills?.map(s => s._id) || [],
    datasets: [{
      label: 'Candidates with skill',
      data: topSkills?.map(s => s.count) || [],
      backgroundColor: '#3b82f6',
      borderRadius: 6,
    }],
  };

  const funnelChart = {
    labels: hiringFunnel?.map(f => f._id) || [],
    datasets: [{
      data: hiringFunnel?.map(f => f.count) || [],
      backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280'],
    }],
  };

  const jobStatusChart = jobData ? {
    labels: jobData.byStatus?.map(s => s._id) || [],
    datasets: [{
      data: jobData.byStatus?.map(s => s.count) || [],
      backgroundColor: ['#6b7280', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6'],
    }],
  } : null;

  const MetricCard = ({ label, value, sub }) => (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
      <p className="text-3xl font-bold text-primary-600">{value ?? '—'}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Recruitment performance insights</p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Jobs" value={overview?.totalJobs} sub={`${overview?.activeJobs} active`} />
        <MetricCard label="Total Resumes" value={overview?.totalResumes} sub={`${overview?.pendingResumes} pending`} />
        <MetricCard label="Candidates" value={overview?.totalCandidates} />
        <MetricCard label="Duplicates Blocked" value={overview?.duplicateResumes} sub="Auto-detected" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">ATS Match Score Distribution</h2>
          <Bar data={scoreChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Hiring Pipeline</h2>
          <Doughnut data={funnelChart} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }} />
        </div>
      </div>

      {/* Top Skills */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Top Skills in Candidate Pool</h2>
        <Bar data={skillsChart} options={{ responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }} />
      </div>

      {/* Per-Job Analytics */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Job-Level Analytics</h2>
          <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Select a job</option>
            {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
        </div>

        {jobData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">{jobData.total}</p>
                <p className="text-sm text-gray-500">Total Applicants</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{jobData.avgScore?.avg?.toFixed(1) || 0}%</p>
                <p className="text-sm text-gray-500">Avg Match Score</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{jobData.avgScore?.max || 0}%</p>
                <p className="text-sm text-gray-500">Top Score</p>
              </div>
            </div>
            <div className="lg:col-span-1">
              {jobStatusChart && <Doughnut data={jobStatusChart} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, title: { display: true, text: 'By Status' } } }} />}
            </div>
            <div className="lg:col-span-1">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Top Candidates</h3>
              <div className="space-y-2">
                {jobData.topCandidates?.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.candidate?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 truncate">{r.candidate?.email}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.matchScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.matchScore}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">Select a job to view detailed analytics</div>
        )}
      </div>
    </div>
  );
}
