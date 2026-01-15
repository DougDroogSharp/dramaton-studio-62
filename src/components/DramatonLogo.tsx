import React from 'react';

export const DramatonLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 200 200" 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="12" 
    strokeLinecap="square" 
    strokeLinejoin="miter"
  >
    {/* Sad Mask (Back/Right) */}
    <g transform="translate(70, 20)">
      <rect x="10" y="20" width="80" height="100" />
      <path d="M25 20 L25 5" />
      <path d="M75 20 L75 5" />
      <path d="M25 50 L45 60" />
      <path d="M75 50 L55 60" />
      <path d="M30 95 L50 85 L70 95" />
    </g>

    {/* Happy Mask (Front/Left) */}
    <g transform="translate(30, 50)">
      <rect x="10" y="20" width="80" height="100" className="fill-diesel-black" stroke="none" />
      <rect x="10" y="20" width="80" height="100" />
      <path d="M25 20 L25 5" />
      <path d="M75 20 L75 5" />
      <rect x="25" y="45" width="12" height="12" fill="currentColor" stroke="none" />
      <rect x="65" y="45" width="12" height="12" fill="currentColor" stroke="none" />
      <path d="M30 85 L50 95 L70 85" />
    </g>
  </svg>
);
