import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { candidatesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = { applied: 'bg-blue-100 text-blue-700', screening: 'bg-yellow-100 text-yellow-700', interview: 'bg-purple-100 text-purple-700', offer: 'bg-green-100 text-green-700', hired: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };

export default function CandidateDetail() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    candidatesAPI.getById(id).then(r => setCandidate(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    try {
      const res = await candidatesAPI.addNote(id, note);
      setCandidate(res.data);
      setNote('');
      toast.success('Note added');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  if (!candidate) return <div className="text-center py-20 text-gray-400">Candidate not found</div>;

  const { extractedData } = candidate.resumes?.[0] || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/candidates" className="text-gray-400 hover:text-gray-600"><ArrowLeftIcon className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Candidate Profile</h1>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start gap-5">
          <UserCircleIcon className="w-16 h-16 text-gray-300 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{candidate.name}</h2>
            <p className="text-gray-500">{candidate.currentTitle}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span>{candidate.email}</span>
              {candidate.phone && <span>{candidate.phone}</span>}
              {candidate.location && <span>{candidate.location}</span>}
              <span>{candidate.totalExperienceYears} years experience</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {candidate.skills?.map((s, i) => <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{s}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Experience */}
          {extractedData?.experience?.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Work Experience</h3>
              <div className="space-y-4">
                {extractedData.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-primary-200 pl-4">
                    <p className="font-medium text-gray-900">{exp.title}</p>
                    <p className="text-sm text-primary-600">{exp.company}</p>
                    <p className="text-xs text-gray-400">{exp.duration}</p>
                    {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {extractedData?.education?.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Education</h3>
              <div className="space-y-3">
                {extractedData.education.map((edu, i) => (
                  <div key={i} className="border-l-2 border-purple-200 pl-4">
                    <p className="font-medium text-gray-900">{edu.degree} in {edu.field}</p>
                    <p className="text-sm text-purple-600">{edu.institution}</p>
                    <p className="text-xs text-gray-400">{edu.year} {edu.gpa && `· GPA: ${edu.gpa}`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Applications */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Applications ({candidate.applications?.length || 0})</h3>
            <div className="space-y-2">
              {candidate.applications?.map((app, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{app.job?.title || 'Unknown Position'}</p>
                    <p className="text-xs text-gray-400">{new Date(app.appliedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[app.status]}`}>{app.status}</span>
                </div>
              ))}
              {!candidate.applications?.length && <p className="text-sm text-gray-400">No applications yet</p>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Certifications */}
          {extractedData?.certifications?.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Certifications</h3>
              <ul className="space-y-1">
                {extractedData.certifications.map((c, i) => <li key={i} className="text-sm text-gray-600">• {c}</li>)}
              </ul>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Recruiter Notes</h3>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {candidate.notes?.map((n, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{n.text}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
              {!candidate.notes?.length && <p className="text-sm text-gray-400">No notes yet</p>}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            <button onClick={handleAddNote} disabled={addingNote || !note.trim()}
              className="mt-2 w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
