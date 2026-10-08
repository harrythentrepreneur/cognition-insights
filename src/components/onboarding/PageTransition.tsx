'use client';

import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .page-transition {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
      
      <div className="page-transition">
        {children}
      </div>
    </>
  );
}