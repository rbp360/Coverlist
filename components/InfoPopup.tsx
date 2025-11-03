import React from 'react';

interface InfoPopupProps {
  message: React.ReactNode;
  width?: string;
  className?: string;
  children: React.ReactNode;
}

export const InfoPopup: React.FC<InfoPopupProps> = ({
  message,
  width = 'w-64',
  className = '',
  children,
}) => (
  <div className={`relative group ${className}`}>
    {children}
    <div
      className={`absolute left-1/2 -translate-x-1/2 mt-2 ${width} bg-black text-white text-xs rounded shadow-lg p-2 opacity-0 group-hover:opacity-100 pointer-events-none z-20 border border-gray-700 transition-opacity duration-200`}
      role="tooltip"
    >
      {message}
    </div>
  </div>
);
