import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  className?: string;
  showIcon?: boolean;
}

export function ErrorMessage({ message, className = '', showIcon = true }: ErrorMessageProps) {
  return (
    <div 
      className={`flex items-center gap-2 text-sm ${className}`}
      style={{
        color: 'rgb(220, 53, 69)',
        fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
        fontWeight: '500',
        padding: '8px 12px',
        backgroundColor: 'rgba(220, 53, 69, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(220, 53, 69, 0.1)',
      }}
    >
      {showIcon && (
        <AlertCircle 
          className="flex-shrink-0" 
          size={16} 
          strokeWidth={2.5}
        />
      )}
      <span>{message}</span>
    </div>
  );
}

// Alternative inline error message (minimal style, no background)
export function InlineError({ message, className = '' }: { message: string; className?: string }) {
  return (
    <span 
      className={`text-sm ${className}`}
      style={{
        color: 'rgb(220, 53, 69)',
        fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
        fontWeight: '500',
      }}
    >
      {message}
    </span>
  );
}