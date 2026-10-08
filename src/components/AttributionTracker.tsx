'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function AttributionTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;

    // List of attribution parameters to look for
    const paramsToTrack = [
      'utm_source',
      'utm_campaign',
      'utm_medium',
      'utm_content',
      'utm_term',
      'fbclid',
      'ref',
    ];

    let hasAttributionData = false;
    const attributionData: Record<string, string> = {};

    paramsToTrack.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        attributionData[param] = value;
        hasAttributionData = true;
      }
    });

    if (hasAttributionData) {
      // We only want to save if there's actual tracking data in the URL
      // This ensures we keep the original attribution even as they navigate the site
      try {
        localStorage.setItem('cognition_attribution', JSON.stringify(attributionData));
      } catch (e) {
        console.error('Failed to save attribution data to localStorage', e);
      }
    }
  }, [searchParams]);

  return null; // Silent tracking component
}
