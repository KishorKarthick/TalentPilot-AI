import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { candidatesAPI } from '../utils/api';
import { MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Spinner from '../components/Spinner';

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skills, setSkills] = useState('');

  useEffect(() => {
    setLoading(true);
    candidatesAPI.getAll({ search, skills, limit: 50 })
      .then(r => { setCandidates(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [search, skills]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total candidates</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, title..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Filter by skills (comma-separated)"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64" />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Candidate', 'Skills', 'Experience', 'Applications', 'Source', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {candidates.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <UserCircleIcon className="w-9 h-9 text-gray-300 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {c.skills?.slice(0, 3).map((s, i) => <span key={i} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">{s}</span>)}
                      {c.skills?.length > 3 && <span className="text-xs text-gray-400">+{c.skills.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{c.totalExperienceYears ? `${c.totalExperienceYears} yrs` : '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{c.applications?.length || 0}</td>
                  <td className="px-5 py-4"><span className="text-xs capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c.source}</span></td>
                  <td className="px-5 py-4">
                    <Link to={`/candidates/${c._id}`} className="text-sm text-primary-600 hover:underline font-medium">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!candidates.length && (
            <div className="text-center py-12 text-gray-400">
              <UserCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No candidates found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
