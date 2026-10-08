import { CSSProperties } from 'react';

export const timelineStyles = {
  container: {
    position: 'relative',
    padding: '40px 20px',
    minHeight: '100%',
  } as CSSProperties,

  timelineLine: {
    position: 'absolute',
    left: '50%',
    top: '0',
    bottom: '0',
    width: '2px',
    background: 'linear-gradient(180deg, rgba(0, 245, 212, 0.2), rgba(157, 78, 221, 0.2))',
    transform: 'translateX(-50%)',
  } as CSSProperties,

  timelineItem: {
    position: 'relative',
    marginBottom: '40px',
    display: 'flex',
    alignItems: 'flex-start',
  } as CSSProperties,

  timelineItemLeft: {
    flexDirection: 'row-reverse',
    textAlign: 'right',
  } as CSSProperties,

  timelineItemRight: {
    flexDirection: 'row',
    textAlign: 'left',
  } as CSSProperties,

  timelineMarker: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  } as CSSProperties,

  markerDot: {
    borderRadius: '50%',
    boxShadow: '0 0 12px currentColor',
    animation: 'pulse 3s ease-in-out infinite',
  } as CSSProperties,

  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    color: '#6B7280',
    fontSize: '16px',
  } as CSSProperties,

  essenceContainer: {
    marginTop: '80px',
    padding: '40px',
    background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.08), rgba(157, 78, 221, 0.08))',
    borderRadius: '20px',
    border: '1px solid rgba(0, 245, 212, 0.3)',
    textAlign: 'center',
  } as CSSProperties,

  essenceTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#00F5D4',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  } as CSSProperties,

  essenceText: {
    fontSize: '20px',
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 1.6,
    marginBottom: '24px',
    fontStyle: 'italic',
  } as CSSProperties,

  visualMetaphor: {
    fontSize: '14px',
    color: '#A0A0B0',
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    lineHeight: 1.5,
  } as CSSProperties,
};