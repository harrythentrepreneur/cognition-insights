import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface Chapter {
  id: string;
  title: string;
  ref: React.RefObject<HTMLDivElement | null>;
}

interface TableOfContentsProps {
  chapters: Chapter[];
  activeChapter: string;
  onChapterClick: (chapterId: string) => void;
  onExport?: () => void;
}

const styles = {
  container: {
    background: 'rgba(26, 26, 46, 0.4)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(0, 255, 230, 0.1)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(8px)',
    position: 'sticky',
    top: '20px',
    transition: 'all 0.3s ease',
    maxWidth: '280px',
  } as CSSProperties,
  
  header: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(0, 255, 230, 0.15)',
  } as CSSProperties,
  
  title: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    textShadow: '0 0 8px rgba(0, 255, 230, 0.3)',
  } as CSSProperties,
  
  subtitle: {
    fontSize: '0.775rem',
    color: colors.textSecondary,
    fontWeight: 400,
    opacity: 0.8,
    letterSpacing: '0.02em',
  } as CSSProperties,
  
  exportButton: {
    width: '100%',
    marginTop: '16px',
    padding: '10px 12px',
    backgroundColor: 'rgba(0, 255, 230, 0.08)',
    border: '1px solid rgba(0, 255, 230, 0.2)',
    borderRadius: '6px',
    color: colors.accent,
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  } as CSSProperties,
  
  exportButtonHover: {
    backgroundColor: 'rgba(0, 255, 230, 0.12)',
    borderColor: 'rgba(0, 255, 230, 0.3)',
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 8px rgba(0, 255, 230, 0.15)',
  } as CSSProperties,
  
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  } as CSSProperties,
  
  item: {
    // No margin needed due to gap in parent
  } as CSSProperties,
  
  link: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    color: colors.textSecondary,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.825rem',
    fontWeight: 400,
    position: 'relative',
    background: 'transparent',
    border: '1px solid transparent',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateX(0)',
  } as CSSProperties,
  
  linkActive: {
    color: colors.accent,
    background: 'rgba(0, 255, 230, 0.06)',
    border: '1px solid rgba(0, 255, 230, 0.15)',
    fontWeight: 500,
    textShadow: '0 0 6px rgba(0, 255, 230, 0.2)',
  } as CSSProperties,
  
  linkHover: {
    color: colors.accent,
    background: 'rgba(0, 255, 230, 0.04)',
    borderColor: 'rgba(0, 255, 230, 0.1)',
    transform: 'translateX(2px)',
  } as CSSProperties,
  
  indicator: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: 'rgba(184, 184, 208, 0.4)',
    marginRight: '12px',
    transition: 'all 0.25s ease',
    flexShrink: 0,
  } as CSSProperties,
  
  indicatorActive: {
    width: '5px',
    height: '5px',
    background: colors.accent,
    boxShadow: '0 0 6px rgba(0, 255, 230, 0.4)',
  } as CSSProperties,
  
  indicatorHover: {
    background: colors.accent,
    boxShadow: '0 0 4px rgba(0, 255, 230, 0.3)',
  } as CSSProperties,
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  chapters,
  activeChapter,
  onChapterClick,
  onExport,
}) => {
  const handleClick = (chapter: Chapter) => {
    onChapterClick(chapter.id);
    chapter.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  return (
    <nav style={styles.container} className="no-print">
      <div style={styles.header}>
        <h2 style={styles.title}>Contents</h2>
        <p style={styles.subtitle}>Navigate through your analysis</p>
      </div>
      <ul style={styles.list}>
        {chapters.map((chapter, index) => {
          const isActive = activeChapter === chapter.id;
          
          return (
            <li key={chapter.id} style={styles.item}>
              <a
                href={`#${chapter.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(chapter);
                }}
                style={{
                  ...styles.link,
                  ...(isActive ? styles.linkActive : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    Object.assign(e.currentTarget.style, styles.linkHover);
                    const indicator = e.currentTarget.querySelector('span') as HTMLElement;
                    if (indicator) {
                      Object.assign(indicator.style, styles.indicatorHover);
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    Object.assign(e.currentTarget.style, {
                      color: colors.textSecondary,
                      background: 'transparent',
                      borderColor: 'transparent',
                      transform: 'translateX(0)',
                    });
                    const indicator = e.currentTarget.querySelector('span') as HTMLElement;
                    if (indicator) {
                      Object.assign(indicator.style, {
                        background: 'rgba(184, 184, 208, 0.4)',
                        boxShadow: 'none',
                      });
                    }
                  }
                }}
              >
                <span
                  style={{
                    ...styles.indicator,
                    ...(isActive ? styles.indicatorActive : {}),
                  }}
                />
                {`${index + 1}. ${chapter.title}`}
              </a>
            </li>
          );
        })}
      </ul>
      
      {onExport && (
        <button
          style={styles.exportButton}
          onClick={onExport}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, styles.exportButtonHover);
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, {
              backgroundColor: 'rgba(0, 255, 230, 0.08)',
              borderColor: 'rgba(0, 255, 230, 0.2)',
              transform: 'translateY(0px)',
              boxShadow: 'none',
            });
          }}
        >
          <span>📄</span>
          Export PDF
        </button>
      )}
    </nav>
  );
};