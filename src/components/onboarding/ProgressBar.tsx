'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}

interface ProgressBarProps {
  steps: ProgressStep[];
  encouragingMessage?: string;
  subMessage?: string;
}

export default function ProgressBar({ steps, encouragingMessage, subMessage }: ProgressBarProps) {
  const currentStepIndex = steps.findIndex(step => step.current);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const styles = {
    container: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      zIndex: 40,
      backdropFilter: 'blur(10px)',
    },
    content: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '24px 20px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    logoImage: {
      height: '24px',
      width: 'auto',
    },
    message: {
      fontSize: '14px',
      color: '#6366f1',
      fontWeight: '500',
      textAlign: 'right' as const,
    },
    subMessage: {
      fontSize: '12px',
      color: '#94a3b8',
      marginTop: '2px',
      textAlign: 'right' as const,
    },
    progressContainer: {
      position: 'relative' as const,
      marginBottom: '20px',
    },
    progressBackground: {
      height: '4px',
      backgroundColor: '#e2e8f0',
      borderRadius: '2px',
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: '#6366f1',
      borderRadius: '2px',
      transition: 'width 0.5s ease-out',
    },
    stepsContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      position: 'relative' as const,
    },
    step: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      position: 'relative' as const,
      flex: 1,
    },
    stepCircle: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
      border: '2px solid #e2e8f0',
      transition: 'all 0.3s ease',
      position: 'relative' as const,
      zIndex: 2,
    },
    stepCircleCompleted: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    stepCircleCurrent: {
      backgroundColor: '#6366f1',
      borderColor: '#6366f1',
      boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.1)',
    },
    stepNumber: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#94a3b8',
    },
    stepNumberActive: {
      color: '#fff',
    },
    stepLabel: {
      fontSize: '12px',
      color: '#64748b',
      marginTop: '8px',
      textAlign: 'center' as const,
      maxWidth: '100px',
    },
    stepLabelActive: {
      color: '#0f172a',
      fontWeight: '500',
    },
    connector: {
      position: 'absolute' as const,
      top: '16px',
      left: '50%',
      right: '-50%',
      height: '2px',
      backgroundColor: '#e2e8f0',
      zIndex: 1,
    },
    connectorCompleted: {
      backgroundColor: '#10b981',
    },
    checkIcon: {
      width: '16px',
      height: '16px',
      color: '#fff',
    },
    pulse: {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: 'rgba(99, 102, 241, 0.3)',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
  };

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.5);
          }
        }
      `}</style>
      
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.header}>
            <div style={styles.logo}>
              <img 
                src="/logos/cognition.cv.svg"
                alt="Cognition"
                style={styles.logoImage}
              />
            </div>
            {encouragingMessage && (
              <div>
                <div style={styles.message}>{encouragingMessage}</div>
                {subMessage && <div style={styles.subMessage}>{subMessage}</div>}
              </div>
            )}
          </div>

          <div style={styles.progressContainer}>
            <div style={styles.progressBackground}>
              <div 
                style={{
                  ...styles.progressBar,
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <div key={step.id} style={styles.step}>
                <div
                  style={{
                    ...styles.stepCircle,
                    ...(step.completed ? styles.stepCircleCompleted : {}),
                    ...(step.current ? styles.stepCircleCurrent : {}),
                  }}
                >
                  {step.current && !step.completed && (
                    <div style={styles.pulse} />
                  )}
                  {step.completed ? (
                    <Check style={styles.checkIcon} />
                  ) : (
                    <span 
                      style={{
                        ...styles.stepNumber,
                        ...((step.completed || step.current) ? styles.stepNumberActive : {}),
                      }}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                <span 
                  style={{
                    ...styles.stepLabel,
                    ...((step.completed || step.current) ? styles.stepLabelActive : {}),
                  }}
                >
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div 
                    style={{
                      ...styles.connector,
                      ...(steps[index].completed ? styles.connectorCompleted : {}),
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}