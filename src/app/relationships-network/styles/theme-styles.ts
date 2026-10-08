import { CSSProperties } from 'react';

export const themeStyles = {
  container: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  } as CSSProperties,

  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    color: '#6B7280',
    fontSize: '16px',
  } as CSSProperties,

  themeMap: {
    position: 'relative',
    height: '400px',
    marginBottom: '24px',
    background: 'radial-gradient(ellipse at center, rgba(0, 245, 212, 0.05) 0%, transparent 70%)',
    borderRadius: '20px',
  } as CSSProperties,

  themeBubble: {
    position: 'absolute',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    '&:hover': {
      transform: 'scale(1.05)',
    }
  } as CSSProperties,

  themeName: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    padding: '8px',
  } as CSSProperties,

  connectionSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  } as CSSProperties,

  themeDetails: {
    flex: 1,
    padding: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'auto',
  } as CSSProperties,

  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  } as CSSProperties,

  detailsTitle: {
    fontSize: '20px',
    fontWeight: '600',
  } as CSSProperties,

  closeDetails: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#A0A0B0',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  } as CSSProperties,

  detailsDescription: {
    fontSize: '14px',
    color: '#E0E0E0',
    lineHeight: 1.6,
    marginBottom: '24px',
  } as CSSProperties,

  detailsElements: {
    marginBottom: '24px',
  } as CSSProperties,

  elementsTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#00F5D4',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px',
  } as CSSProperties,

  elementItem: {
    fontSize: '13px',
    color: '#A0A0B0',
    padding: '8px 12px',
    marginBottom: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '6px',
    borderLeft: '3px solid',
  } as CSSProperties,

  detailsSignificance: {
    padding: '16px',
    backgroundColor: 'rgba(0, 245, 212, 0.08)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 245, 212, 0.2)',
    fontSize: '13px',
    color: '#E0E0E0',
    lineHeight: 1.6,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  } as CSSProperties,

  significanceIcon: {
    fontSize: '20px',
    flexShrink: 0,
  } as CSSProperties,
};