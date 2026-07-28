import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { jobsAPI, resumesAPI } from '../utils/api';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { CloudArrowUpIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const StatusIcon = ({ status }) => {
  if (status === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
  if (status === 'duplicate') return <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />;
  if (status === 'failed') return <XCircleIcon className="w-5 h-5 text-red-500" />;
  return <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />;
};

export default function ResumeUpload() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    jobsAPI.getAll({ status: 'active', limit: 100 })
      .then(r => setJobs(r.data))
      .catch((err) => toast.error(err.message || 'Failed to load jobs'));
  }, []);

  const onDrop = useCallback((accepted) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const newFiles = accepted.filter(f => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
    setResults(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleUpload = async () => {
    if (!files.length) return toast.error('Please select files');
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('resumes', f));
      if (selectedJob) formData.append('jobId', selectedJob);

      const res = await resumesAPI.upload(formData);
      setResults(res.results);
      const { success, duplicates, failed } = res.results;
      // Per-file failures never reject the request — report them explicitly.
      if (failed.length) toast.error(`${failed.length} of ${files.length} resumes failed to process`);
      if (success.length) toast.success(`Processed ${success.length} resumes${duplicates.length ? ` (${duplicates.length} duplicates skipped)` : ''}`);
      setFiles([]);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Resumes</h1>
        <p className="text-gray-500 text-sm mt-1">Bulk upload up to 100 resumes. AI will extract and score them automatically.</p>
      </div>

      {/* Job Selection */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">Match Against Job (Optional)</label>
        <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">— No job selected (general upload) —</option>
          {jobs.map(j => <option key={j._id} value={j._id}>{j.title} · {j.company}</option>)}
        </select>
        {selectedJob && <p className="text-xs text-primary-600 mt-1">✓ Resumes will be scored against this job description</p>}
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 bg-white'}`}>
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">{isDragActive ? 'Drop files here...' : 'Drag & drop resumes here'}</p>
        <p className="text-sm text-gray-400 mt-1">or click to browse · PDF, DOC, DOCX · Max 10MB each · Up to 100 files</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{files.length} file{files.length > 1 ? 's' : ''} selected</span>
            <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline">Clear all</button>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-3 px-5 py-3">
                <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
                <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => removeFile(f.name)} className="text-gray-300 hover:text-red-500 text-lg leading-none">✕</button>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t">
            <button onClick={handleUpload} disabled={uploading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {uploading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>) : `Upload & Analyze ${files.length} Resume${files.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Upload Results</h2>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600">✓ {results.success.length} processed</span>
              <span className="text-amber-600">⚠ {results.duplicates.length} duplicates</span>
              <span className="text-red-600">✕ {results.failed.length} failed</span>
            </div>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {results.success.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <StatusIcon status="success" />
                <span className="flex-1 text-sm text-gray-700 truncate">{r.file}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.matchScore >= 70 ? 'bg-green-100 text-green-700' : r.matchScore >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {r.matchScore}% match
                </span>
              </div>
            ))}
            {results.duplicates.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <StatusIcon status="duplicate" />
                <span className="flex-1 text-sm text-gray-700 truncate">{r.file}</span>
                <span className="text-xs text-amber-600">Duplicate</span>
              </div>
            ))}
            {results.failed.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <StatusIcon status="failed" />
                <span className="flex-1 text-sm text-gray-700 truncate">{r.file}</span>
                <span className="text-xs text-red-500 truncate max-w-32">{r.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
