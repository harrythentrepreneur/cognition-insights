import React, { useState, useRef, useEffect, CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { TableOfContents } from './TableOfContents';
import { ExecutiveSummary } from './ExecutiveSummary';
import { LifeNarrativeChapter } from './LifeNarrativeChapter';
import { PersonalityArchitecture } from './PersonalityArchitecture';
import { EmotionalDynamics } from './EmotionalDynamics';
import { CommunicationPatterns } from './CommunicationPatterns';
import { TriggersAnalysis } from './TriggersAnalysis';
import { GrowthDevelopment } from './GrowthDevelopment';
import { ComparativeAnalysis } from './ComparativeAnalysis';
import { Recommendations } from './Recommendations';
import { FloatingProgress } from '../ui/FloatingProgress';
import { ChapterTransition } from '../ui/ChapterTransition';
import { EnhancedCard } from '../ui/EnhancedCard';
import { VisualizationErrorBoundary } from '../visualizations/SafeVisualizationWrapper';
import { ErrorBoundary } from '../ErrorBoundary';
import { ChatEvidencePanel } from '../shared/ChatEvidencePanel';
// import { MobileGestures } from '../ui/MobileGestures';
// import { AIInsightsPanel } from '../ui/AIInsightsPanel';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface PersonalityReportProps {
  data: any;
  sessionId?: string;
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '100vw',
    margin: '0 auto',
    padding: '20px 36px 0px 56px',
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: fonts.body,
    lineHeight: 1.8,
    boxSizing: 'border-box',
  } as CSSProperties,
  
  header: {
    textAlign: 'center',
    marginBottom: '48px',
    paddingBottom: '32px',
    borderBottom: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  title: {
    fontSize: '3rem',
    fontWeight: 400,
    color: colors.accent,
    marginBottom: '24px',
    letterSpacing: '-0.01em',
    fontFamily: fonts.body,
  } as CSSProperties,
  
  subtitle: {
    fontSize: '1.25rem',
    color: colors.textSecondary,
    fontWeight: 300,
    marginBottom: '16px',
    fontFamily: fonts.body,
  } as CSSProperties,
  
  metadata: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    fontFamily: fonts.body,
  } as CSSProperties,
  
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as CSSProperties,
  
  content: {
    display: 'flex',
    gap: '32px',
    position: 'relative',
    alignItems: 'flex-start',
    minHeight: '100vh',
    maxWidth: '100%',
  } as CSSProperties,
  
  tocWrapper: {
    position: 'sticky',
    top: '180px',
    height: 'fit-content',
    flex: '0 0 280px',
    alignSelf: 'flex-start',
    zIndex: 10,
    WebkitPosition: 'sticky' as any,
  } as CSSProperties,
  
  mainContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: 'calc(100% - 312px)',
  } as CSSProperties,
  
  chapter: {
    marginBottom: '60px',
    scrollMarginTop: '60px',
  } as CSSProperties,
  
  
  '@media (max-width: 1024px)': {
    container: {
      padding: '16px 20px 0px 24px',
    },
    content: {
      flexDirection: 'column',
      gap: '24px',
    },
    mainContent: {
      maxWidth: '100%',
    },
    tocWrapper: {
      position: 'relative',
      flex: '1 1 auto',
      marginBottom: '24px',
      top: 'auto',
      willChange: 'auto',
      width: '100%',
      maxWidth: '100%',
    },
  },
};

export const PersonalityReport: React.FC<PersonalityReportProps> = ({ data, sessionId }) => {
  // Debug logging to trace data flow
  console.log('[DEBUG] PersonalityReport received data:', data);
  console.log('[DEBUG] PersonalityReport - has narrative_content:', !!data?.narrative_content);
  if (data?.narrative_content?.executive_summary) {
    console.log('[DEBUG] PersonalityReport - executive_summary keys:', Object.keys(data.narrative_content.executive_summary));
    if (data.narrative_content.executive_summary.profile) {
      console.log('[DEBUG] PersonalityReport - profile preview:', data.narrative_content.executive_summary.profile.substring(0, 100) + '...');
    }
  }
  
  const [activeChapter, setActiveChapter] = useState('executive-summary');
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const chapters = [
    { id: 'executive-summary', title: 'Executive Summary', ref: useRef<HTMLDivElement>(null) },
    { id: 'life-narrative', title: 'Life Narrative & Meaning', ref: useRef<HTMLDivElement>(null) },
    { id: 'personality-architecture', title: 'Personality Architecture', ref: useRef<HTMLDivElement>(null) },
    { id: 'emotional-dynamics', title: 'Emotional Dynamics', ref: useRef<HTMLDivElement>(null) },
    { id: 'communication-patterns', title: 'Communication Patterns', ref: useRef<HTMLDivElement>(null) },
    { id: 'triggers-analysis', title: 'Triggers & Vulnerabilities', ref: useRef<HTMLDivElement>(null) },
    { id: 'growth-development', title: 'Growth & Development', ref: useRef<HTMLDivElement>(null) },
    { id: 'comparative-analysis', title: 'Comparative Analysis', ref: useRef<HTMLDivElement>(null) },
    { id: 'recommendations', title: 'Recommendations', ref: useRef<HTMLDivElement>(null) },
  ];

  // Track scroll position for active chapter detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200; // Adjusted to account for header and spacing
      const windowHeight = window.innerHeight;
      
      // Find the chapter that's currently most visible
      let activeChapterId = chapters[0].id;
      let maxVisibility = 0;
      
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        if (chapter.ref.current) {
          const rect = chapter.ref.current.getBoundingClientRect();
          const chapterTop = chapter.ref.current.offsetTop;
          const chapterBottom = chapterTop + chapter.ref.current.offsetHeight;
          
          // Calculate how much of the chapter is visible
          const visibleTop = Math.max(0, Math.min(rect.bottom, windowHeight));
          const visibleBottom = Math.max(0, Math.min(windowHeight, rect.bottom) - Math.max(0, rect.top));
          const visibleHeight = visibleBottom;
          
          // Check if this chapter is in the viewport
          if (rect.top <= windowHeight * 0.3 && rect.bottom > 0) {
            // If the chapter starts in the top 30% of viewport, it's active
            activeChapterId = chapter.id;
            break;
          }
        }
      }
      
      if (activeChapterId !== activeChapter) {
        setActiveChapter(activeChapterId);
        const index = chapters.findIndex(ch => ch.id === activeChapterId);
        setCurrentChapterIndex(index);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [chapters, activeChapter]);

  // Mobile gesture handlers removed for stability
  
  const handleExport = () => {
    // Enhanced print functionality with better formatting
    const printContent = reportRef.current;
    if (!printContent) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Copy the content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Personality Analysis Report</title>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Times New Roman', serif;
              line-height: 1.6;
              color: #333;
              background: white;
              font-size: 12pt;
            }
            
            .print-container {
              max-width: 8.5in;
              margin: 0 auto;
              padding: 0.5in;
            }
            
            h1 {
              font-size: 24pt;
              margin-bottom: 20pt;
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10pt;
            }
            
            h2 {
              font-size: 18pt;
              margin: 30pt 0 15pt 0;
              border-bottom: 1px solid #666;
              padding-bottom: 5pt;
              page-break-after: avoid;
            }
            
            h3 {
              font-size: 14pt;
              margin: 20pt 0 10pt 0;
              page-break-after: avoid;
            }
            
            p {
              margin-bottom: 12pt;
              text-align: justify;
              orphans: 2;
              widows: 2;
            }
            
            .chapter {
              page-break-before: always;
              margin-bottom: 40pt;
            }
            
            .chapter:first-child {
              page-break-before: avoid;
            }
            
            .visualization {
              margin: 20pt 0;
              padding: 15pt;
              border: 1px solid #ccc;
              page-break-inside: avoid;
              text-align: center;
            }
            
            .insight {
              margin: 15pt 0;
              padding: 12pt;
              border-left: 4px solid #333;
              background: #f5f5f5;
              font-style: italic;
              page-break-inside: avoid;
            }
            
            .quote {
              margin: 15pt 0;
              padding-left: 20pt;
              border-left: 4px solid #666;
              font-style: italic;
              font-size: 13pt;
            }
            
            .metadata {
              text-align: center;
              margin-bottom: 30pt;
              font-size: 10pt;
              color: #666;
            }
            
            .no-print {
              display: none !important;
            }
            
            canvas, svg {
              max-width: 100% !important;
              height: auto !important;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .page-break {
                page-break-before: always;
              }
              
              .avoid-break {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML
              .replace(/class="[^"]*no-print[^"]*"/g, 'class="no-print"')
              .replace(/style="[^"]*"/g, '')
              .replace(/<button[^>]*>.*?<\/button>/g, '')
              .replace(/<canvas[^>]*>/g, '<div class="visualization">[Visualization: Chart or Graph]</div>')
              .replace(/<svg[^>]*>.*?<\/svg>/g, '<div class="visualization">[Visualization: Interactive Chart]</div>')
            }
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait a moment for the content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  };
  
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  return (
    <div ref={reportRef} style={styles.container} className="personality-report-container">
      {/* Divider Line */}
      <div style={{
        borderBottom: `1px solid ${colors.border}`,
        marginBottom: '32px',
        marginTop: '0'
      }} />
      
      {/* Floating Progress Indicator */}
      <FloatingProgress 
        chapters={chapters}
        activeChapter={activeChapter}
        onChapterClick={setActiveChapter}
      />

      {/* AI Insights Panel - Disabled for now */}
      {/* <AIInsightsPanel 
        currentChapter={activeChapter}
        personalityData={data}
        isVisible={false}
        position="right"
      /> */}

      {/* Main Content */}
      <div style={styles.content}>
        {/* Table of Contents */}
        <div style={styles.tocWrapper} className="no-print">
          <TableOfContents 
            chapters={chapters}
            activeChapter={activeChapter}
            onChapterClick={setActiveChapter}
            onExport={handleExport}
          />
        </div>
        
        {/* Report Chapters with Enhanced Transitions */}
        <div style={styles.mainContent}>
          <ChapterTransition
            chapterId="executive-summary"
            title="Executive Summary"
            isActive={activeChapter === 'executive-summary'}
            delay={0}
          >
            <div ref={chapters[0].ref} id="executive-summary" style={styles.chapter}>
              <VisualizationErrorBoundary>
                <ExecutiveSummary data={data} />
              </VisualizationErrorBoundary>
            </div>
          </ChapterTransition>
          
          <ChapterTransition
            chapterId="life-narrative"
            title="Chapter 1: Life Narrative & Meaning"
            isActive={activeChapter === 'life-narrative'}
            delay={100}
          >
            <div ref={chapters[1].ref} id="life-narrative" style={styles.chapter}>
              <ErrorBoundary sectionName="Life Narrative">
                <LifeNarrativeChapter data={data} sessionId={sessionId} />
              </ErrorBoundary>
            </div>
          </ChapterTransition>
          
          <ChapterTransition
            chapterId="personality-architecture"
            title="Chapter 2: Personality Architecture"
            isActive={activeChapter === 'personality-architecture'}
            delay={150}
          >
            <div ref={chapters[2].ref} id="personality-architecture" style={styles.chapter}>
              <PersonalityArchitecture data={data} />
            </div>
          </ChapterTransition>
          
          <ChapterTransition
            chapterId="emotional-dynamics"
            title="Chapter 3: Emotional Dynamics"
            isActive={activeChapter === 'emotional-dynamics'}
            delay={200}
          >
            <div ref={chapters[3].ref} id="emotional-dynamics" style={styles.chapter}>
              <VisualizationErrorBoundary>
                <EmotionalDynamics data={data} />
              </VisualizationErrorBoundary>
            </div>
          </ChapterTransition>
          
          <ChapterTransition
            chapterId="communication-patterns"
            title="Chapter 4: Communication & Social Patterns"
            isActive={activeChapter === 'communication-patterns'}
            delay={250}
          >
            <div ref={chapters[4].ref} id="communication-patterns" style={styles.chapter}>
              <VisualizationErrorBoundary>
                <CommunicationPatterns data={data} />
              </VisualizationErrorBoundary>
            </div>
          </ChapterTransition>
          
          <ChapterTransition
            chapterId="triggers-analysis"
            title="Chapter 5: Triggers & Vulnerabilities"
            isActive={activeChapter === 'triggers-analysis'}
            delay={300}
          >
            <div ref={chapters[5].ref} id="triggers-analysis" style={styles.chapter}>
              <VisualizationErrorBoundary>
                <TriggersAnalysis data={data} />
              </VisualizationErrorBoundary>
            </div>
          </ChapterTransition>
          
          <ChapterTransition
            chapterId="growth-development"
            title="Chapter 6: Growth & Development"
            isActive={activeChapter === 'growth-development'}
            delay={350}
          >
            <div ref={chapters[6].ref} id="growth-development" style={styles.chapter}>
              <GrowthDevelopment data={data} />
            </div>
          </ChapterTransition>
          
          <ChapterTransition
            chapterId="comparative-analysis"
            title="Chapter 7: Comparative Analysis"
            isActive={activeChapter === 'comparative-analysis'}
            delay={400}
          >
            <div ref={chapters[7].ref} id="comparative-analysis" style={styles.chapter}>
              <ComparativeAnalysis data={data} />
            </div>
          </ChapterTransition>
          
          <ChapterTransition
            chapterId="recommendations"
            title="Chapter 8: Synthesis & Recommendations"
            isActive={activeChapter === 'recommendations'}
            delay={450}
          >
            <div ref={chapters[8].ref} id="recommendations" style={styles.chapter}>
              <Recommendations data={data} />
            </div>
          </ChapterTransition>
          
          {/* Chat Evidence Panel - Data-driven insights */}
          <ChapterTransition
            chapterId="chat-evidence"
            title="Chat Analysis Evidence"
            isActive={activeChapter === 'chat-evidence'}
            delay={500}
          >
            <div style={styles.chapter}>
              <ChatEvidencePanel data={data} />
            </div>
          </ChapterTransition>
        </div>
      </div>
      
      {/* Print Styles and Targeted Chart Containment */}
      <style jsx global>{`
        /* Global overflow prevention only at body level */
        body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }
        
        /* Ensure box-sizing for all elements */
        .personality-report-container * {
          box-sizing: border-box !important;
        }
        
        /* Targeted chart containment without breaking sticky behavior */
        .personality-report-container .visualization-container,
        .personality-report-container .chart-wrapper,
        .personality-report-container .personality-3d-container,
        .personality-report-container .personality-dna-container {
          max-width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        
        /* Chart.js specific containment */
        .personality-report-container canvas {
          max-width: 100% !important;
          height: auto !important;
          box-sizing: border-box !important;
        }
        
        /* SVG containment for D3 charts */
        .personality-report-container svg {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* 3D visualization containment */
        .personality-report-container .three-canvas,
        .personality-report-container .webgl-canvas {
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* Recharts wrapper containment */
        .personality-report-container .recharts-wrapper {
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        @media print {
          body {
            background: white;
            color: black;
          }
          
          .no-print {
            display: none !important;
          }
          
          .chapter {
            page-break-before: always;
          }
          
          .chapter:first-child {
            page-break-before: avoid;
          }
        }
      `}</style>
    </div>
  );
};