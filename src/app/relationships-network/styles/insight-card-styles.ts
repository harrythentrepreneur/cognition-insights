import { CSSProperties } from 'react';

export const cardStyles = {
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    position: 'relative',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderLeftStyle: 'solid',
    maxWidth: '400px',
    width: '100%',
    margin: '0 20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      transform: 'translateY(-2px)',
    }
  } as CSSProperties,

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  } as CSSProperties,

  cardDate: {
    fontSize: '12px',
    fontWeight: '500',
  } as CSSProperties,

  expandIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: '#A0A0B0',
  } as CSSProperties,

  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: '8px',
    lineHeight: 1.3,
  } as CSSProperties,

  cardDescription: {
    fontSize: '13px',
    color: '#A0A0B0',
    lineHeight: 1.5,
  } as CSSProperties,

  expandedContent: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    animation: 'fadeIn 0.3s ease',
  } as CSSProperties,

  snippetSection: {
    marginBottom: '16px',
  } as CSSProperties,

  snippetLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#00F5D4',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  } as CSSProperties,

  snippetText: {
    fontSize: '13px',
    color: '#E0E0E0',
    fontStyle: 'italic',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    lineHeight: 1.5,
  } as CSSProperties,

  impactSection: {
    marginBottom: '16px',
  } as CSSProperties,

  impactLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9D4EDD',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  } as CSSProperties,

  impactText: {
    fontSize: '13px',
    color: '#A0A0B0',
    lineHeight: 1.5,
  } as CSSProperties,

  significanceSection: {
    marginBottom: '8px',
  } as CSSProperties,

  significanceLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  } as CSSProperties,

  significanceBar: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
  } as CSSProperties,

  significanceFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  } as CSSProperties,
};