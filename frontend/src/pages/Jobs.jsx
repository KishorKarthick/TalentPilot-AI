import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import ErrorState from '../components/ErrorState';
import { PlusIcon, MagnifyingGlassIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = { active: 'bg-success-100 text-success-700', paused: 'bg-warning-100 text-warning-700', closed: 'bg-gray-100 text-gray-600', draft: 'bg-blue-100 text-blue-700' };

const JobForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { title: '', company: '', department: '', location: '', type: 'full-time', description: '', skills: '', status: 'active' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, skills: form.skills ? form.skills.split(',').map(s => s.trim()) : [] };
      await onSave(payload);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const f = (key, label, type = 'text', required = true) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} required={required} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">{initial ? 'Edit Job' : 'Post New Job'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {f('title', 'Job Title')}
            {f('company', 'Company')}
            {f('department', 'Department', 'text', false)}
            {f('location', 'Location', 'text', false)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {['full-time', 'part-time', 'contract', 'internship', 'remote'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {['active', 'paused', 'closed', 'draft'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills (comma-separated)</label>
            <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="React, Node.js, MongoDB" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [error, setError] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobsAPI.getAll({ search, status, limit: 50 });
      setJobs(res.data);
      setTotal(res.total);
    } catch (err) {
      setJobs([]);
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [search, status]);

  const handleCreate = async (data) => {
    await jobsAPI.create(data);
    toast.success('Job posted!');
    fetchJobs();
  };

  const handleUpdate = async (data) => {
    await jobsAPI.update(editJob._id, data);
    toast.success('Job updated!');
    fetchJobs();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      await jobsAPI.delete(id);
      toast.success('Job deleted');
      fetchJobs();
    } catch (err) {
      toast.error(err.message || 'Failed to delete job');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 text-sm mt-1">{total} positions</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          <PlusIcon className="w-4 h-4" /> Post Job
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Status</option>
          {['active', 'paused', 'closed', 'draft'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchJobs} />
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div key={job._id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-primary-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BriefcaseIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/jobs/${job._id}`} className="font-semibold text-gray-900 hover:text-primary-600">{job.title}</Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[job.status]}`}>{job.status}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{job.type}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{job.company} {job.location && `· ${job.location}`}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.skills?.slice(0, 5).map((s, i) => <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{s}</span>)}
                      {job.skills?.length > 5 && <span className="text-xs text-gray-400">+{job.skills.length - 5}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-gray-500">{job.applicantCount} applicants</span>
                  <button onClick={() => { setEditJob({ ...job, skills: job.skills?.join(', ') }); setShowForm(true); }}
                    className="text-xs text-primary-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(job._id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!jobs.length && (
            <div className="text-center py-16 text-gray-400">
              <BriefcaseIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No jobs found. Post your first job!</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <JobForm
          initial={editJob}
          onSave={editJob ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditJob(null); }}
        />
      )}
    </div>
  );
}
