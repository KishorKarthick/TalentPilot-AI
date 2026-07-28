import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobsAPI, resumesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import ErrorState from '../components/ErrorState';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const ScoreBadge = ({ score }) => {
  const color = score >= 70 ? 'bg-green-100 text-green-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-sm font-bold px-3 py-1 rounded-full ${color}`}>{score}%</span>;
};

const ScoreBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{label}</span><span>{value}%</span></div>
    <div className="h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-primary-500 rounded-full" style={{ width: `${value}%` }} /></div>
  </div>
);

const STATUS_OPTIONS = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
const STATUS_COLORS = { pending: 'bg-gray-100 text-gray-600', reviewed: 'bg-blue-100 text-blue-700', shortlisted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', hired: 'bg-purple-100 text-purple-700' };

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      jobsAPI.getById(id),
      resumesAPI.getByJob(id, { limit: 100 }),
    ]).then(([jobRes, resumeRes]) => {
      setJob(jobRes.data);
      setResumes(resumeRes.data);
      setTotal(resumeRes.total);
    }).catch((err) => setError(err.message || 'Failed to load job'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleStatusChange = async (resumeId, status) => {
    try {
      await resumesAPI.updateStatus(resumeId, status);
      setResumes(prev => prev.map(r => r._id === resumeId ? { ...r, status } : r));
      if (selected?._id === resumeId) setSelected(prev => ({ ...prev, status }));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filtered = resumes.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (minScore && r.matchScore < Number(minScore)) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/jobs" className="text-gray-400 hover:text-gray-600"><ArrowLeftIcon className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job?.title}</h1>
          <p className="text-gray-500 text-sm">{job?.company} · {total} applicants</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={minScore} onChange={(e) => setMinScore(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Scores</option>
          <option value="70">70%+ (Strong)</option>
          <option value="50">50%+ (Good)</option>
          <option value="30">30%+ (Fair)</option>
        </select>
        <span className="text-sm text-gray-500 self-center">{filtered.length} candidates</span>
      </div>

      <div className="flex gap-6">
        {/* Candidate List */}
        <div className="flex-1 space-y-3 min-w-0">
          {filtered.map((resume) => (
            <div key={resume._id}
              onClick={() => setSelected(resume)}
              className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${selected?._id === resume._id ? 'border-primary-400 ring-1 ring-primary-400' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <UserCircleIcon className="w-10 h-10 text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{resume.candidate?.name || resume.extractedData?.name || 'Unknown'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[resume.status]}`}>{resume.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{resume.candidate?.email || resume.extractedData?.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {resume.matchedSkills?.slice(0, 4).map((s, i) => <span key={i} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{s}</span>)}
                  </div>
                </div>
                <ScoreBadge score={resume.matchScore} />
              </div>
            </div>
          ))}
          {!filtered.length && <div className="text-center py-12 text-gray-400">No candidates match the filters</div>}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4 h-fit sticky top-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selected.candidate?.name || selected.extractedData?.name}</h3>
                <p className="text-sm text-gray-500">{selected.extractedData?.currentTitle || selected.extractedData?.experience?.[0]?.title}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500">✕</button>
            </div>

            <div className="text-center py-3 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary-600">{selected.matchScore}%</p>
              <p className="text-xs text-gray-500">Match Score</p>
            </div>

            <div className="space-y-2">
              <ScoreBar label="Skills Match" value={selected.scoreBreakdown?.skillsMatch || 0} />
              <ScoreBar label="Experience" value={selected.scoreBreakdown?.experienceMatch || 0} />
              <ScoreBar label="Education" value={selected.scoreBreakdown?.educationMatch || 0} />
              <ScoreBar label="Keywords" value={selected.scoreBreakdown?.keywordsMatch || 0} />
            </div>

            {selected.aiSummary && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">AI Summary</p>
                <p className="text-xs text-blue-600">{selected.aiSummary}</p>
              </div>
            )}

            {selected.missingSkills?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Missing Skills</p>
                <div className="flex flex-wrap gap-1">
                  {selected.missingSkills.map((s, i) => <span key={i} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{s}</span>)}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Update Status</label>
              <select value={selected.status} onChange={(e) => handleStatusChange(selected._id, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {selected.candidate && (
              <Link to={`/candidates/${selected.candidate._id}`}
                className="block text-center text-sm text-primary-600 font-medium hover:underline">
                View Full Profile →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
