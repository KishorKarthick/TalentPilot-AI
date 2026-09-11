import { useState } from 'react';
import { interviewsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { SparklesIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const POPULAR_ROLES = ['Java Developer', 'Frontend Engineer', 'Full Stack Developer', 'Data Engineer', 'DevOps Specialist'];

export default function AIInterviewer() {
  const [role, setRole] = useState('Java Developer');
  const [customRole, setCustomRole] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const activeRole = customRole.trim() ? customRole : role;

  const handleGenerateQuestions = async () => {
    if (!activeRole) {
      toast.error('Please select or type a role');
      return;
    }
    setLoadingQuestions(true);
    setEvaluation(null);
    setAnswer('');
    setCurrentIdx(0);
    try {
      const res = await interviewsAPI.generateQuestions(activeRole);
      setQuestions(res.data || []);
      toast.success(`Generated questions for ${activeRole}`);
    } catch (err) {
      toast.error(err.message || 'Failed to generate questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleEvaluate = async () => {
    if (!answer.trim()) {
      toast.error('Please provide an answer');
      return;
    }
    setEvaluating(true);
    try {
      const currentQuestion = questions[currentIdx] || `Explain your experience as a ${activeRole}.`;
      const res = await interviewsAPI.evaluateAnswer(activeRole, currentQuestion, answer);
      setEvaluation(res.data);
      toast.success('Answer evaluated!');
    } catch (err) {
      toast.error(err.message || 'Failed to evaluate answer');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-8 h-8 text-yellow-300" />
          <div>
            <h1 className="text-2xl font-bold">🤖 AI Interviewer</h1>
            <p className="text-primary-100 text-sm">Practice mock interviews, get instant feedback, and sharpen your technical skills.</p>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">1. Candidate chooses role</h2>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setCustomRole(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeRole === r && !customRole ? 'bg-primary-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Or type custom role (e.g. Backend Architect)..."
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleGenerateQuestions}
            disabled={loadingQuestions}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary-700 disabled:opacity-60 shadow"
          >
            {loadingQuestions ? 'Generating...' : 'Generate Questions'}
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question & Answer Section */}
      {questions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <div className="flex gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentIdx(i); setEvaluation(null); setAnswer(''); }}
                  className={`w-7 h-7 rounded-full text-xs font-bold ${currentIdx === i ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">{questions[currentIdx]}</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Candidate Answer</label>
            <textarea
              rows={5}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your detailed response here..."
              className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-sans"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleEvaluate}
              disabled={evaluating || !answer.trim()}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-60 shadow"
            >
              {evaluating ? 'Evaluating with AI...' : 'Submit Answer for Evaluation'}
            </button>
          </div>
        </div>
      )}

      {/* Feature 4 Evaluation Result Card */}
      {evaluation && (
        <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-7 h-7 text-emerald-400" />
              <h2 className="text-xl font-bold">System Evaluation Output</h2>
            </div>
            <span className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full font-mono">Role: {activeRole}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
            <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700 flex justify-between items-center">
              <span className="text-gray-300 font-medium font-sans">Technical accuracy:</span>
              <span className="text-lg font-bold text-emerald-400">{evaluation.technicalAccuracy}/10</span>
            </div>
            <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700 flex justify-between items-center">
              <span className="text-gray-300 font-medium font-sans">Communication:</span>
              <span className="text-lg font-bold text-blue-400">{evaluation.communication}/10</span>
            </div>
            <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700 flex justify-between items-center">
              <span className="text-gray-300 font-medium font-sans">Problem solving:</span>
              <span className="text-lg font-bold text-purple-400">{evaluation.problemSolving}/10</span>
            </div>
            <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700 flex justify-between items-center bg-gradient-to-r from-emerald-950 to-gray-800">
              <span className="text-gray-100 font-bold font-sans">Overall:</span>
              <span className="text-xl font-extrabold text-yellow-400">{evaluation.overall}/10</span>
            </div>
          </div>

          {evaluation.feedback && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 font-sans">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Feedback & Recommendations</p>
              <p className="text-sm text-gray-200 leading-relaxed">{evaluation.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
