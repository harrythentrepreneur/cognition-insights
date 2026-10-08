'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import HamburgerMenu from '@/components/HamburgerMenu';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { styles as dashboardStyles } from '@/app/emotional-landscapes/styles';
import { NAVIGATION_ITEMS } from '@/app/emotional-landscapes/constants';
import { 
  BlurBackdrop, 
  NavigationButton 
} from '@/app/emotional-landscapes/components';
import { buildRelativeUrlWithSession } from '@/utils/sessionUtils';

interface PageLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  hideBottomNav?: boolean;
  hideBlurEffects?: boolean;
  hideHamburger?: boolean;
  customCloseButton?: boolean;
  disableHeaderTransitions?: boolean;
  customHeaderPosition?: {
    top?: string;
    left?: string;
    right?: string;
    alignWithNavigation?: boolean;
  };
  customLogoSize?: 'small' | 'medium' | 'large';
  initialHeaderAnimation?: {
    opacity?: number;
    transform?: string;
  };
  navigationTransition?: {
    isTransitioning: boolean;
    style?: React.CSSProperties;
  };
}

/**
 * Internal component that uses useSearchParams
 * Must be wrapped in Suspense for SSR compatibility
 */
function PageLayoutContent({ children, activeSection, hideBottomNav, hideBlurEffects, hideHamburger, customCloseButton, disableHeaderTransitions, customHeaderPosition, customLogoSize, initialHeaderAnimation, navigationTransition }: PageLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleNavigationClick = (sectionId: string) => {
    // Map section IDs to their respective routes
    const routeMap: Record<string, string> = {
      'emotional-landscapes': '/emotional-landscapes',
      'relationships-network': '/relationships-network',
      'language-patterns': '/language-patterns',
      'personality-analysis': '/personality-analysis',
      'growth-journey': '/growth-journey'
    };

    const route = routeMap[sectionId];
    if (route) {
      // Preserve sessionData parameter if it exists (in addition to session)
      const sessionData = searchParams.get('sessionData');
      const additionalParams: Record<string, string> = {};
      
      if (sessionData) {
        additionalParams.sessionData = sessionData;
      }
      
      // Build URL with session ID automatically preserved
      const finalRoute = buildRelativeUrlWithSession(route, additionalParams);
      router.push(finalRoute);
    }
  };

  const handleCloseClick = () => {
    const finalRoute = buildRelativeUrlWithSession('/growth-journey');
    router.push(finalRoute);
  };

  // Navigation transition styles
  const navTransitionStyle = navigationTransition?.isTransitioning ? {
    opacity: 0,
    transform: 'scale(0.98) translateY(-10px)',
    filter: 'blur(8px) brightness(0.7) saturate(0.8)',
    transition: 'all 2.2s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'none' as const,
    ...navigationTransition.style
  } : {
    opacity: 1,
    transform: 'scale(1) translateY(0px)',
    filter: 'blur(0px) brightness(1) saturate(1)',
    transition: 'all 2.2s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'auto' as const
  };

  // Header positioning - use custom position if provided, otherwise use default
  const logoPosition = customHeaderPosition ? {
    ...DESIGN_TOKENS.layout.logoPosition,
    top: customHeaderPosition.top || DESIGN_TOKENS.layout.logoPosition.top,
    left: customHeaderPosition.left || DESIGN_TOKENS.layout.logoPosition.left
  } : DESIGN_TOKENS.layout.logoPosition;
  
  const hamburgerPosition = customHeaderPosition ? {
    ...DESIGN_TOKENS.layout.hamburgerPosition,
    top: customHeaderPosition.top || DESIGN_TOKENS.layout.hamburgerPosition.top,
    right: customHeaderPosition.right || DESIGN_TOKENS.layout.hamburgerPosition.right
  } : DESIGN_TOKENS.layout.hamburgerPosition;

  return (
    <div style={dashboardStyles.page}>
      {/* Background Blur Effects */}
      {!hideBlurEffects && (
        <>
          <BlurBackdrop position="logo" />
          <BlurBackdrop position="hamburger" />
        </>
      )}
      
      {/* Fixed Header Elements */}
      <div 
        className="header-logo-wrapper"
        style={{
        position: 'fixed',
        ...logoPosition,
        zIndex: 100,
        ...(disableHeaderTransitions ? {} : navTransitionStyle)
      }}>
        <Logo size={customLogoSize || "medium"} />
      </div>

      {!hideHamburger && (
        <div style={{
          position: 'fixed',
          ...hamburgerPosition,
          zIndex: 100,
          ...navTransitionStyle
        }}>
          <HamburgerMenu />
        </div>
      )}

      {customCloseButton && (
        <div 
          className="header-close-wrapper"
          style={{
          position: 'fixed',
          ...hamburgerPosition,
          zIndex: 100,
          ...(disableHeaderTransitions ? {} : navTransitionStyle)
        }}>
          <button
            onClick={handleCloseClick}
            className="close-button-x"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              padding: '0'
            }}
          >
            {/* X icon with same style as hamburger lines */}
            <div
              style={{
                position: 'relative',
                width: '24px',
                height: '24px'
              }}
            >
              <div
                className="close-x-line"
                style={{
                  position: 'absolute',
                  width: '24px',
                  height: '2px',
                  backgroundColor: '#00F5D4',
                  borderRadius: '1px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  transition: 'filter 0.3s ease',
                  filter: 'none'
                }}
              />
              <div
                className="close-x-line"
                style={{
                  position: 'absolute',
                  width: '24px',
                  height: '2px',
                  backgroundColor: '#00F5D4',
                  borderRadius: '1px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-45deg)',
                  transition: 'filter 0.3s ease',
                  filter: 'none'
                }}
              />
            </div>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={dashboardStyles.mainContent}>
        <div id="section-content-area">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      {!hideBottomNav && (
        <nav style={{
          ...dashboardStyles.navigation,
          ...navTransitionStyle
        }} aria-label="Page Sections">
          {NAVIGATION_ITEMS.map((item) => (
            <NavigationButton
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
              onClick={() => handleNavigationClick(item.id)}
            />
          ))}
        </nav>
      )}
    </div>
  );
}

/**
 * Shared Page Layout Component
 * 
 * Provides consistent navigation structure across all pages:
 * - Fixed logo and hamburger menu in header
 * - Bottom navigation bar
 * - Backdrop blur effects
 * - Main content area
 */
export default function PageLayout({ children, activeSection, hideBottomNav, hideBlurEffects, hideHamburger, customCloseButton, disableHeaderTransitions, customHeaderPosition, customLogoSize, initialHeaderAnimation, navigationTransition }: PageLayoutProps) {
  return (
          <Suspense fallback={
      <div style={dashboardStyles.page}>
        {/* Background Blur Effects */}
        {!hideBlurEffects && (
          <>
            <BlurBackdrop position="logo" />
            <BlurBackdrop position="hamburger" />
          </>
        )}
        
        {/* Fixed Header Elements */}
        <div style={{
          position: 'fixed',
          ...DESIGN_TOKENS.layout.logoPosition,
          zIndex: 100
        }}>
          <Logo size="medium" />
        </div>

        <div style={{
          position: 'fixed',
          ...DESIGN_TOKENS.layout.hamburgerPosition,
          zIndex: 100
        }}>
          <HamburgerMenu />
        </div>

        {/* Main Content Area */}
        <main style={dashboardStyles.mainContent}>
          <div id="section-content-area">
            {children}
          </div>
        </main>

        {/* Bottom Navigation - Static without search params */}
        {!hideBottomNav && (
          <nav style={dashboardStyles.navigation} aria-label="Page Sections">
            {NAVIGATION_ITEMS.map((item) => (
              <NavigationButton
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => {}} // No-op during loading
              />
            ))}
          </nav>
        )}
      </div>
    }>
      <PageLayoutContent activeSection={activeSection} hideBottomNav={hideBottomNav} hideBlurEffects={hideBlurEffects} hideHamburger={hideHamburger} customCloseButton={customCloseButton} disableHeaderTransitions={disableHeaderTransitions} customHeaderPosition={customHeaderPosition} customLogoSize={customLogoSize} initialHeaderAnimation={initialHeaderAnimation} navigationTransition={navigationTransition}>
        {children}
      </PageLayoutContent>
    </Suspense>
  );
} 