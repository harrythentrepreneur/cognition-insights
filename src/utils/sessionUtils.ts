/**
 * Session Management Utilities
 * 
 * Provides consistent session ID handling across all pages and components
 */

/**
 * Extract session ID from current URL
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('session') || params.get('sessionId');
}

/**
 * Build URL with session ID preserved from current URL
 */
export function buildUrlWithSession(basePath: string, additionalParams?: Record<string, string>): string {
  const sessionId = getCurrentSessionId();
  
  const url = new URL(basePath, window.location.origin);
  
  // Always preserve session if it exists
  if (sessionId) {
    url.searchParams.set('session', sessionId);
  }
  
  // Add any additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}

/**
 * Navigate to URL with session ID preserved
 */
export function navigateWithSession(targetPath: string, additionalParams?: Record<string, string>): void {
  const url = buildUrlWithSession(targetPath, additionalParams);
  window.location.href = url;
}

/**
 * Build relative URL with session preserved (for use with Next.js router)
 */
export function buildRelativeUrlWithSession(basePath: string, additionalParams?: Record<string, string>): string {
  const sessionId = getCurrentSessionId();
  
  const params = new URLSearchParams();
  
  // Always preserve session if it exists
  if (sessionId) {
    params.set('session', sessionId);
  }
  
  // Add any additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }
  
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
} 