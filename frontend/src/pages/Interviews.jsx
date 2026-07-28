import { useEffect, useState } from 'react';
import { interviewsAPI, candidatesAPI, jobsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import ErrorState from '../components/ErrorState';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const STATUS_COLORS = { scheduled: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700', rescheduled: 'bg-yellow-100 text-yellow-700', no_show: 'bg-gray-100 text-gray-600' };

const ScheduleModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ candidate: '', job: '', type: 'video', round: 1, scheduledAt: '', duration: 60, meetingLink: '', notes: '' });
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([candidatesAPI.getAll({ limit: 100 }), jobsAPI.getAll({ status: 'active', limit: 100 })])
      .then(([c, j]) => { setCandidates(c.data); setJobs(j.data); })
      .catch((err) => toast.error(err.message || 'Failed to load candidates and jobs'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Schedule Interview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Candidate</label>
            <select required value={form.candidate} onChange={(e) => setForm({ ...form, candidate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select candidate</option>
              {candidates.map(c => <option key={c._id} value={c._id}>{c.name} · {c.email}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
            <select required value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select job</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title} · {j.company}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {['phone', 'video', 'onsite', 'technical', 'hr'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
              <input type="number" min="1" max="5" value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
            <input type="url" value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
              placeholder="https://meet.google.com/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">
              {loading ? 'Scheduling...' : 'Schedule & Notify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FeedbackModal = ({ interview, onClose, onSave }) => {
  const [form, setForm] = useState({ rating: 3, technicalScore: 70, communicationScore: 70, cultureFitScore: 70, notes: '', recommendation: 'yes' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(interview._id, form);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Submit Feedback</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating: {form.rating}/5</label>
            <input type="range" min="1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="w-full" />
          </div>
          {[['technicalScore', 'Technical Score'], ['communicationScore', 'Communication'], ['cultureFitScore', 'Culture Fit']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}: {form[key]}%</label>
              <input type="range" min="0" max="100" value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} className="w-full" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
            <select value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              {['strong_yes', 'yes', 'maybe', 'no', 'strong_no'].map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Interviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);

  const fetchInterviews = () => {
    setLoading(true);
    setError(null);
    interviewsAPI.getAll({ status: statusFilter })
      .then(r => setInterviews(r.data))
      .catch((err) => {
        setInterviews([]);
        setError(err.message || 'Failed to load interviews');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInterviews(); }, [statusFilter]);

  const handleSchedule = async (data) => {
    const res = await interviewsAPI.create(data);
    // The interview is saved even when the notification email fails — say which happened.
    if (res.emailSent) toast.success('Interview scheduled! Candidate notified via email.');
    else toast(`Interview scheduled, but no email was sent: ${res.emailError}`, { icon: '⚠️' });
    fetchInterviews();
  };

  const handleFeedback = async (id, data) => {
    await interviewsAPI.submitFeedback(id, data);
    toast.success('Feedback submitted');
    fetchInterviews();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-500 text-sm mt-1">{interviews.length} interviews</p>
        </div>
        <button onClick={() => setShowSchedule(true)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          <PlusIcon className="w-4 h-4" /> Schedule Interview
        </button>
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Status</option>
          {['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchInterviews} />
      ) : (
        <div className="space-y-3">
          {interviews.map((iv) => (
            <div key={iv._id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{iv.candidate?.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[iv.status]}`}>{iv.status.replace('_', ' ')}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">Round {iv.round} · {iv.type}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{iv.job?.title} · {iv.job?.company}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(iv.scheduledAt), 'MMM d, yyyy · h:mm a')} · {iv.duration} min
                    </p>
                    {iv.meetingLink && (
                      <a href={iv.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline mt-1 block">Join Meeting →</a>
                    )}
                    {iv.feedback?.recommendation && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Recommendation:</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${iv.feedback.recommendation.includes('yes') ? 'bg-green-100 text-green-700' : iv.feedback.recommendation === 'maybe' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {iv.feedback.recommendation.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {iv.status === 'scheduled' && (
                  <button onClick={() => setFeedbackInterview(iv)}
                    className="text-sm text-primary-600 hover:underline font-medium flex-shrink-0">
                    Submit Feedback
                  </button>
                )}
              </div>
            </div>
          ))}
          {!interviews.length && (
            <div className="text-center py-16 text-gray-400">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No interviews scheduled</p>
            </div>
          )}
        </div>
      )}

      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSave={handleSchedule} />}
      {feedbackInterview && <FeedbackModal interview={feedbackInterview} onClose={() => setFeedbackInterview(null)} onSave={handleFeedback} />}
    </div>
  );
}
