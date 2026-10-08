import { CSSProperties } from 'react';

export const reflectionStyles = {
  container: {
    padding: '0',
    width: '100%',
    height: '100%',
    overflow: 'auto',
  } as CSSProperties,

  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    color: '#6B7280',
    fontSize: '16px',
  } as CSSProperties,

  reflectionGroup: {
    marginBottom: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '16px',
  } as CSSProperties,

  groupHeader: {
    marginBottom: '12px',
  } as CSSProperties,

  groupTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#00F5D4',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 245, 212, 0.1)',
    borderRadius: '6px',
    border: '1px solid rgba(0, 245, 212, 0.2)',
    textAlign: 'center',
  } as CSSProperties,

  reflectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '8px',
    position: 'relative',
    transition: '0.3s',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderLeftStyle: 'solid',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      transform: 'translateX(2px)',
    }
  } as CSSProperties,

  cardDate: {
    fontSize: '11px',
    color: '#00F5D4',
    fontWeight: '500',
    marginBottom: '4px',
  } as CSSProperties,

  cardTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#A0A0B0',
    marginBottom: '3px',
    lineHeight: 1.3,
  } as CSSProperties,

  cardDescription: {
    fontSize: '11px',
    color: '#A0A0B0',
    opacity: 0.7,
    lineHeight: 1.3,
  } as CSSProperties,

  wisdomSection: {
    marginTop: '32px',
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.08), rgba(255, 215, 0, 0.08))',
    borderRadius: '16px',
    border: '1px solid rgba(255, 107, 157, 0.3)',
  } as CSSProperties,

  wisdomTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FF6B9D',
    marginBottom: '12px',
    textAlign: 'center',
  } as CSSProperties,

  wisdomText: {
    fontSize: '14px',
    color: '#FFFFFF',
    lineHeight: 1.6,
    textAlign: 'center',
    fontStyle: 'italic',
  } as CSSProperties,

  storySection: {
    marginTop: '24px',
    padding: '24px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  } as CSSProperties,

  storyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#00F5D4',
    marginBottom: '16px',
  } as CSSProperties,

  storyText: {
    fontSize: '13px',
    color: '#E0E0E0',
    lineHeight: 1.8,
    textAlign: 'justify',
  } as CSSProperties,
};