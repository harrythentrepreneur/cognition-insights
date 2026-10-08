import React from 'react';
import { analysisWindowStyles } from '../styles/ui-states';

interface AnalysisWindowLabelProps {
  label: string;
  subtext?: string;
}

/**
 * Reusable Analysis Window Label Component
 * 
 * Displays a glassy label with an icon and optional subtext
 * Used for showing time ranges and analysis context
 */
export const AnalysisWindowLabel: React.FC<AnalysisWindowLabelProps> = ({ 
  label, 
  subtext 
}) => {
  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={analysisWindowStyles.container}>
        <svg style={analysisWindowStyles.icon} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        <span style={analysisWindowStyles.label}>
          {label}
        </span>
      </div>
      {subtext && (
        <div style={analysisWindowStyles.subtext}>
          {subtext}
        </div>
      )}
    </div>
  );
};