import { CSSProperties } from 'react';

export const deepInsightsStyles = {
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '25px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  } as CSSProperties,

  header: {
    padding: '24px 32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.05), rgba(157, 78, 221, 0.05))',
    position: 'relative',
  } as CSSProperties,

  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '4px',
  } as CSSProperties,

  subtitle: {
    fontSize: '16px',
    color: '#A0A0B0',
    fontWeight: '400',
  } as CSSProperties,

  closeButton: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#A0A0B0',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: '#FFFFFF',
    }
  } as CSSProperties,

  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  } as CSSProperties,

  tab: {
    flex: 1,
    padding: '16px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#A0A0B0',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderBottom: '2px solid transparent',
    position: 'relative',
    outline: 'none',
  } as CSSProperties,

  tabActive: {
    color: '#00F5D4',
    backgroundColor: 'rgba(0, 245, 212, 0.1)',
    borderBottomColor: '#00F5D4',
  } as CSSProperties,

  contentContainer: {
    flex: 1,
    padding: '24px',
    overflow: 'auto',
    color: '#A0A0B0',
    fontSize: '14px',
    lineHeight: 1.6,
  } as CSSProperties,

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  } as CSSProperties,

  loadingSpinner: {
    color: '#00F5D4',
    fontSize: '16px',
  } as CSSProperties,

  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  } as CSSProperties,

  errorMessage: {
    color: '#FF6B6B',
    fontSize: '16px',
  } as CSSProperties,
};