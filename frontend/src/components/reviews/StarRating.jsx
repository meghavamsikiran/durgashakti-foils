import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({
  value = 0,
  count = 0,
  size = 'sm',
  interactive = false,
  onChange,
  className = '',
}) => {
  const iconSize = size === 'lg' ? 'w-9 h-9' : size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  const labelSize = size === 'lg' ? 'text-sm' : 'text-xs';
  const roundedValue = Number(value || 0);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = interactive ? star <= roundedValue : star <= Math.round(roundedValue);
          const commonClass = `${iconSize} transition-colors ${filled ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`;
          if (interactive) {
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange?.(star)}
                className="p-0.5 rounded hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <Star className={commonClass} />
              </button>
            );
          }
          return <Star key={star} className={commonClass} />;
        })}
      </div>
      {!interactive && count > 0 && (
        <span className={`${labelSize} font-bold text-slate-500 font-mono`}>
          {roundedValue.toFixed(roundedValue % 1 === 0 ? 0 : 1)} ({count})
        </span>
      )}
    </div>
  );
};

export default StarRating;
