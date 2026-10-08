import React from 'react';
import { loadingStateStyles, errorStateStyles, animationKeyframes } from '../styles/ui-states';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationKeyframes }} />
      <div style={loadingStateStyles.container}>
        <div style={loadingStateStyles.spinner} />
        <div style={loadingStateStyles.text}>
          {message}
        </div>
      </div>
    </>
  );
};

interface ErrorStateProps {
  message?: string;
  details?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message = 'Something went wrong',
  details = 'Please try again later.'
}) => {
  return (
    <div style={errorStateStyles.container}>
      <div style={errorStateStyles.iconWrapper}>
        <svg style={errorStateStyles.icon} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div style={errorStateStyles.message}>
        {message}
      </div>
      {details && (
        <div style={errorStateStyles.details}>
          {details}
        </div>
      )}
    </div>
  );
};