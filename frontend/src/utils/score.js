// Maps an ATS/match score to its badge color classes.
export const scoreColorClass = (score) =>
  score >= 70
    ? 'bg-green-100 text-green-700'
    : score >= 40
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';
