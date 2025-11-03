import React from 'react';

interface CardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement<{ className?: string }>;
  color: string; // Now a text color class, e.g., 'text-blue-600'
}

export const Card: React.FC<CardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="card-base flex items-center p-3 sm:p-4">
      <div className={`mr-3 sm:mr-4 ${color}`}>
        {React.cloneElement(icon, { className: `w-7 h-7 sm:w-8 sm:h-8 ${icon.props.className || ''}`.trim() })}
      </div>
      <div className="overflow-hidden">
        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{title}</p>
        <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
};
