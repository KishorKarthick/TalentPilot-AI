import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-16">
      <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-3 text-amber-500" />
      <p className="text-gray-700 font-medium">Something went wrong</p>
      <p className="text-sm text-gray-500 mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          Try again
        </button>
      )}
    </div>
  );
}
