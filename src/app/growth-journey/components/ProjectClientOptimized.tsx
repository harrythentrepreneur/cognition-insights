"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ReactLenis from "@studio-freight/react-lenis";
import { buildRelativeUrlWithSession } from "@/utils/sessionUtils";
import Logo from '@/components/Logo';
import HamburgerMenu from '@/components/HamburgerMenu';
import { 
  NavigationButton 
} from '@/app/emotional-landscapes/components';
import { NAVIGATION_ITEMS } from '@/app/emotional-landscapes/constants';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { styles as dashboardStyles } from '@/app/emotional-landscapes/styles';
import "../experience.css";

interface ProjectData {
  title: string;
  description: string;
  images: string[];
  slug: string;
  cards?: Array<{
    title: string;
    description: string;
    time?: string;
    emotion?: string;
    intensity?: number;
  }>;
}

interface ProjectClientProps {
  project: ProjectData;
  nextProject: ProjectData | null;
  prevProject: ProjectData | null;
}

// Helper function to generate placeholder image
const getPlaceholderImage = (index: number) => {
  // Use a gradient based on index for variety
  const colors = ['#00FFE6', '#00D9CC', '#00B3A6', '#009688', '#00796B'];
  const color = colors[index % colors.length];
  return `data:image/svg+xml,%3Csvg width='1024' height='1024' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1024' height='1024' fill='%231A1A2E'/%3E%3Ctext x='50%25' y='50%25' font-family='Inter, sans-serif' font-size='48' fill='${encodeURIComponent(color)}' text-anchor='middle' dominant-baseline='middle'%3EStory ${index + 1}%3C/text%3E%3C/svg%3E`;
};

// Component for lazy-loaded story sections
const LazyStorySection = ({ image, card, index }: { 
  image: string; 
  card: any; 
  index: number;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState(image);

  useEffect(() => {
    // Set placeholder if no image provided
    if (!image || image === '') {
      setImageSrc(getPlaceholderImage(index));
      setImageError(true);
    }
  }, [image, index]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Animate text when section becomes visible
    const textElement = sectionRef.current?.querySelector('.story-narration');
    const blurOverlay = sectionRef.current?.querySelector('.blur-overlay');
    
    if (textElement && blurOverlay) {
      gsap.set(textElement, {
        opacity: 0,
        y: 40,
        scale: 0.95
      });

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 75%",
        once: true,
        onEnter: () => {
          blurOverlay.classList.add('fade-out');
          
          gsap.to(textElement, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.4,
            ease: "power3.out",
            onComplete: () => {
              textElement.classList.add('active');
            }
          });
        }
      });
    }
  }, [isVisible]);

  return (
    <div ref={sectionRef}>
      {/* Full-page image section */}
      <div className="story-section story-image">
        {isVisible ? (
          <img 
            src={imageSrc} 
            alt={`Story moment ${index + 1}`}
            onLoad={() => {
              console.log(`✅ Image ${index + 1} loaded`);
              setImageLoaded(true);
            }}
            onError={(e) => {
              console.error(`❌ Image ${index + 1} failed:`, (e.target as HTMLImageElement).src);
              if (!imageError) {
                // First error - try placeholder
                setImageSrc(getPlaceholderImage(index));
                setImageError(true);
              }
            }}
            style={{
              opacity: imageLoaded || imageError ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#232340',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ color: '#666', fontSize: '14px' }}>Loading...</div>
          </div>
        )}
      </div>
      
      {/* Full-page text section */}
      {card && (
        <div className="story-section story-text">
          <div className="story-content">
            <div className="blur-overlay"></div>
            <p className="story-narration">{card.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ProjectClientOptimized({ project, nextProject, prevProject }: ProjectClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectNavRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 }); // Increased initial render to 10 items

  console.log('🎬 ProjectClientOptimized received:', {
    projectTitle: project?.title,
    projectImages: project?.images?.length || 0,
    projectCards: project?.cards?.length || 0,
    imagesArray: Array.isArray(project?.images),
    cardsArray: Array.isArray(project?.cards),
    firstImage: project?.images?.[0],
    firstCard: project?.cards?.[0],
    imagesSample: project?.images?.slice(0, 3)
  });

  const handleNavigationClick = (sectionId: string) => {
    const routeMap: Record<string, string> = {
      'emotional-landscapes': '/emotional-landscapes',
      'relationships-network': '/relationships-network',
      'language-patterns': '/language-patterns',
      'personality-analysis': '/personality-analysis',
      'growth-journey': '/growth-journey'
    };

    const route = routeMap[sectionId];
    if (route) {
      const sessionData = searchParams.get('sessionData');
      const additionalParams: Record<string, string> = {};
      
      if (sessionData) {
        additionalParams.sessionData = sessionData;
      }
      
      const finalRoute = buildRelativeUrlWithSession(route, additionalParams);
      router.push(finalRoute);
    }
  };

  // Handle infinite scroll to load more items
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Load more items when user is near the bottom
    if (scrollY + windowHeight > documentHeight - 1000) {
      setVisibleRange(prev => {
        const newEnd = Math.min(prev.end + 5, project.images?.length || 0);
        console.log(`📜 Loading more items: ${prev.end} -> ${newEnd} (total: ${project.images?.length})`);
        return {
          ...prev,
          end: newEnd
        };
      });
    }
  }, [project.images?.length]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Ensure page starts at top on load
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Set elements to their final positions immediately - no entrance animations
    gsap.set(".project-page", { opacity: 1 });
    gsap.set([
      projectNavRef.current,
      ".header-logo-wrapper",
      ".header-hamburger-wrapper"
    ], {
      opacity: 1,
      y: 0,
    });

    const navScrollTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (progressBarRef.current) {
          progressBarRef.current.style.setProperty('--progress', self.progress.toString());
        }
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [nextProject, router, project.slug]);

  // Reset visible range when project changes
  useEffect(() => {
    setVisibleRange({ start: 0, end: 5 });
  }, [project.slug]);

  return (
    <ReactLenis root>
      <div className="project-page">
        
        {/* Fixed Header Elements */}
        <div 
          className="header-logo-wrapper"
          style={{
            position: 'fixed',
            top: '108px',
            left: '56px',
            zIndex: 100
          }}>
          <Logo size="medium" />
        </div>

        <div 
          className="header-hamburger-wrapper"
          style={{
            position: 'fixed',
            top: '108px',
            right: '36px',
            zIndex: 100
          }}>
          <HamburgerMenu />
        </div>
        
        <div className="project-nav" ref={projectNavRef}>
          <div className="project-page-scroll-progress">
            <div
              className="project-page-scroll-progress-bar"
              ref={progressBarRef}
            ></div>
          </div>
        </div>

        <div className="project-hero">
          <div className="project-hero-content">
            <h1>{project.title}</h1>
          </div>
        </div>

        <div className="story-container">
          {project.images && project.images.length > 0 ? (
            project.images.slice(visibleRange.start, visibleRange.end).map((image, index) => {
              const actualIndex = visibleRange.start + index;
              const card = project.cards && project.cards[actualIndex];
              
              console.log(`🖼️ Rendering item ${actualIndex}:`, {
                hasImage: !!image,
                imageUrl: image,
                hasCard: !!card,
                cardPreview: card?.description?.substring(0, 50)
              });
              
              return (
                <LazyStorySection 
                  key={actualIndex}
                  image={image || ''}
                  card={card}
                  index={actualIndex}
                />
              );
            })
          ) : (
            <div style={{
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div>No story images available for {project.title}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Images array length: {project.images?.length || 0}
              </div>
            </div>
          )}
            
          {/* Loading indicator for more content */}
          {visibleRange.end < (project.images?.length || 0) && (
            <div style={{
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}>
              <div>Loading more stories...</div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginTop: '120px',
          marginBottom: '120px',
          padding: '0 24px'
        }}>
          {prevProject && (
            <button
              onClick={() => {
                const url = buildRelativeUrlWithSession('/growth-journey', { year: prevProject.slug });
                router.push(url);
              }}
              style={{
                background: 'transparent',
                border: `1px solid rgba(160, 160, 176, 0.2)`,
                borderRadius: '12px',
                padding: '16px 32px',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '180px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.borderColor = 'rgba(0, 245, 212, 0.4)';
                target.style.backgroundColor = 'rgba(0, 245, 212, 0.1)';
                target.style.color = '#00F5D4';
                target.style.boxShadow = '0 8px 32px rgba(0, 245, 212, 0.2)';
                target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.borderColor = 'rgba(160, 160, 176, 0.2)';
                target.style.backgroundColor = 'transparent';
                target.style.color = '#FFFFFF';
                target.style.boxShadow = 'none';
                target.style.transform = 'translateY(0px)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Return to {prevProject.title}
            </button>
          )}
          
          {nextProject ? (
            <button
              onClick={() => {
                const url = buildRelativeUrlWithSession('/growth-journey', { year: nextProject.slug });
                router.push(url);
              }}
              style={{
                background: 'transparent',
                border: `1px solid rgba(160, 160, 176, 0.2)`,
                borderRadius: '12px',
                padding: '16px 32px',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '180px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.borderColor = 'rgba(0, 245, 212, 0.4)';
                target.style.backgroundColor = 'rgba(0, 245, 212, 0.1)';
                target.style.color = '#00F5D4';
                target.style.boxShadow = '0 8px 32px rgba(0, 245, 212, 0.2)';
                target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.borderColor = 'rgba(160, 160, 176, 0.2)';
                target.style.backgroundColor = 'transparent';
                target.style.color = '#FFFFFF';
                target.style.boxShadow = 'none';
                target.style.transform = 'translateY(0px)';
              }}
            >
              Continue to {nextProject.title}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          ) : (
            <button
              onClick={() => {
                const url = buildRelativeUrlWithSession('/growth-journey');
                router.push(url);
              }}
              style={{
                background: 'transparent',
                border: `1px solid rgba(160, 160, 176, 0.2)`,
                borderRadius: '12px',
                padding: '16px 32px',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '180px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                target.style.borderColor = 'rgba(0, 245, 212, 0.4)';
                target.style.backgroundColor = 'rgba(0, 245, 212, 0.1)';
                target.style.color = '#00F5D4';
                target.style.boxShadow = '0 8px 32px rgba(0, 245, 212, 0.2)';
                target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                target.style.borderColor = 'rgba(160, 160, 176, 0.2)';
                target.style.backgroundColor = 'transparent';
                target.style.color = '#FFFFFF';
                target.style.boxShadow = 'none';
                target.style.transform = 'translateY(0px)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7v10c0 5.55 0 10 10 10s10-4.45 10-10V7l-10-5z"/>
                <path d="M8 11l2 2 4-4"/>
              </svg>
              View Growth Journey
            </button>
          )}
        </div>

        {/* Bottom Navigation */}
        <nav style={dashboardStyles.navigation} aria-label="Page Sections">
          {NAVIGATION_ITEMS.map((item) => (
            <NavigationButton
              key={item.id}
              item={item}
              isActive={'growth-journey' === item.id}
              onClick={() => handleNavigationClick(item.id)}
            />
          ))}
        </nav>
      </div>
    </ReactLenis>
  );
}