// Shared loading spinner used across pages.

const SIZES = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };
const COLORS = { primary: 'border-primary-600', purple: 'border-purple-600' };

export default function Spinner({ size = 'sm', color = 'primary', wrapperClassName = 'flex justify-center py-12' }) {
  return (
    <div className={wrapperClassName}>
      <div className={`animate-spin rounded-full border-b-2 ${SIZES[size]} ${COLORS[color]}`} />
    </div>
  );
}
