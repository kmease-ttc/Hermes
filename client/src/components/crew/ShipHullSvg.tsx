import React from "react";

export function ShipHullSvg({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 900"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hullBodyGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#3a4a5c" />
          <stop offset="50%" stopColor="#2a3a4c" />
          <stop offset="100%" stopColor="#1a2a3c" />
        </linearGradient>
        <linearGradient id="hullHighlight" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id="cockpitGradient" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0%" stopColor="#4a5a6c" />
          <stop offset="100%" stopColor="#2a3a4c" />
        </linearGradient>
        <linearGradient id="engineGlow" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <filter id="engineBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
      </defs>

      <path
        d="M200,15
           C230,15 270,40 290,80
           L320,160
           L350,280
           L360,400
           L355,520
           L340,620
           L320,700
           L290,760
           L260,800
           L240,830
           L200,850
           L160,830
           L140,800
           L110,760
           L80,700
           L60,620
           L45,520
           L40,400
           L50,280
           L80,160
           L110,80
           C130,40 170,15 200,15 Z"
        fill="url(#hullBodyGradient)"
        stroke="rgba(100,120,140,0.6)"
        strokeWidth="2"
      />

      <path
        d="M200,15
           C230,15 270,40 290,80
           L320,160
           L350,280
           L360,400
           L200,400
           L40,400
           L50,280
           L80,160
           L110,80
           C130,40 170,15 200,15 Z"
        fill="url(#hullHighlight)"
        opacity="0.5"
      />

      <path
        d="M200,25
           C220,25 250,45 265,75
           L280,120
           L200,130
           L120,120
           L135,75
           C150,45 180,25 200,25 Z"
        fill="url(#cockpitGradient)"
        stroke="rgba(255,200,100,0.4)"
        strokeWidth="2"
      />

      <ellipse cx="200" cy="80" rx="35" ry="20" fill="rgba(100,150,200,0.3)" stroke="rgba(150,180,210,0.4)" strokeWidth="1" />

      <path
        d="M70,720 L50,780 L40,850 L55,870 L80,850 L95,780 L85,720 Z"
        fill="#2a3a4c"
        stroke="rgba(100,120,140,0.5)"
        strokeWidth="1.5"
      />
      <path
        d="M330,720 L350,780 L360,850 L345,870 L320,850 L305,780 L315,720 Z"
        fill="#2a3a4c"
        stroke="rgba(100,120,140,0.5)"
        strokeWidth="1.5"
      />

      <ellipse cx="60" cy="875" rx="18" ry="30" fill="url(#engineGlow)" filter="url(#engineBlur)" opacity="0.9" />
      <ellipse cx="60" cy="865" rx="12" ry="20" fill="#7dd3fc" />
      
      <ellipse cx="340" cy="875" rx="18" ry="30" fill="url(#engineGlow)" filter="url(#engineBlur)" opacity="0.9" />
      <ellipse cx="340" cy="865" rx="12" ry="20" fill="#7dd3fc" />

      <ellipse cx="200" cy="860" rx="15" ry="25" fill="url(#engineGlow)" filter="url(#engineBlur)" opacity="0.7" />
      <ellipse cx="200" cy="855" rx="10" ry="18" fill="#7dd3fc" />

      <path
        d="M140,200 L260,200"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />
      <path
        d="M100,350 L300,350"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
      <path
        d="M90,500 L310,500"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
      <path
        d="M100,650 L300,650"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="1"
      />

      <circle cx="200" cy="420" r="8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="200" cy="420" r="3" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}
