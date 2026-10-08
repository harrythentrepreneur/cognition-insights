"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import ProjectClient from "./components/ProjectClientOptimized";
// TODO: Reimplement annual stories generation for browser-based processing
// import { fetchAnnualStories, transformAnnualStoriesToTimeline } from "@/lib/annual-stories-api";
const fetchAnnualStories = async (sessionId: string): Promise<any> => null;
const transformAnnualStoriesToTimeline = (data: any) => ({ years: [], navigation: [], overallJourney: {} });
import DarkLoadingScreen from '@/components/shared/DarkLoadingScreen';

// Define a new type for our transformed stage data
interface GrowthJourneyStage {
  id: number;
  slug: string;
  title: string;
  description: string;
  images: string[];
  cards: any[]; // Pass along the full card details
  narrative?: string; // Annual narrative
  summary?: string; // Annual summary
}

function GrowthJourneyContent() {
  const searchParams = useSearchParams();
  const [stageData, setStageData] = useState<{
    project: GrowthJourneyStage;
    nextProject: GrowthJourneyStage | null;
    prevProject: GrowthJourneyStage | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExperienceData = async () => {
      // Extract session ID from URL parameters, with fallback for development
      const urlSessionId = searchParams.get('session') || searchParams.get('sessionId');
      const sessionId = urlSessionId || "test-session-123"; // Fallback for dev/testing
      
      console.log('🎯 Growth Journey - Loading annual stories data for session:', sessionId);
      const annualStoriesResponse = await fetchAnnualStories(sessionId);
      
      console.log('🔍 Raw API Response:', {
        hasResponse: !!annualStoriesResponse,
        hasStoriesByYear: !!annualStoriesResponse?.stories_by_year,
        yearCount: annualStoriesResponse?.stories_by_year ? Object.keys(annualStoriesResponse.stories_by_year).length : 0,
        years: annualStoriesResponse?.stories_by_year ? Object.keys(annualStoriesResponse.stories_by_year) : [],
        firstYearData: annualStoriesResponse?.stories_by_year ? 
          Object.entries(annualStoriesResponse.stories_by_year)[0] : null
      });
      
      if (!annualStoriesResponse || !annualStoriesResponse.stories_by_year) {
        console.log('❌ No annual stories data available');
        setLoading(false);
        return;
      }
      
      // Transform annual stories data to timeline format
      let timelineData;
      try {
        timelineData = transformAnnualStoriesToTimeline(annualStoriesResponse);
      } catch (error) {
        console.error('Error transforming annual stories:', error);
        setLoading(false);
        return;
      }
      
      const totalEvents = timelineData?.years?.reduce((sum, year: any) => sum + (year.cards?.length || 0), 0) || 0;
      console.log('📊 Annual Stories Data Received:', {
        years: timelineData?.years?.length || 0,
        totalEvents: totalEvents,
        firstYearEvents: (timelineData?.years as any)?.[0]?.cards?.length || 0,
        hasNarratives: (timelineData?.years as any)?.[0]?.narrative ? true : false
      });

      // Warn if we have too many events
      if (totalEvents > 100) {
        console.warn(`⚠️ Large dataset detected: ${totalEvents} total events. This may affect performance.`);
      }

      if (timelineData && timelineData.years && timelineData.years.length > 0) {
        const journeyStages: GrowthJourneyStage[] = timelineData.years.map((yearData: any, index: number) => {
          console.log(`📅 Processing year ${yearData.year}:`, {
            cardCount: yearData.cards?.length || 0,
            hasNarrative: !!yearData.narrative,
            firstCard: yearData.cards?.[0],
            imageUrls: yearData.cards?.slice(0, 3).map((c: any) => c.image_url) // First 3 URLs for debugging
          });
          
          return {
            id: index,
            slug: yearData.year.toLowerCase(),
            title: yearData.year,
            description: yearData.narrative || `A reflection of your growth during ${yearData.year}.`,
            images: yearData.cards?.map((card: any) => card.image_url || '') || [],
            cards: yearData.cards || [],
            narrative: yearData.narrative,
            summary: yearData.summary
          };
        });

        const currentPeriodSlug = searchParams.get('year') || searchParams.get('period') || journeyStages[0].slug;

        
        let currentIndex = journeyStages.findIndex(stage => stage.slug === currentPeriodSlug);
        if (currentIndex === -1) {
          currentIndex = 0; // Default to first stage if period not found
        }

        // Check if we're at the last period
        const isLastPeriod = currentIndex === journeyStages.length - 1;
        const isFirstPeriod = currentIndex === 0;
        
        // For next: if last period, set to null (will navigate to /growth-journey)
        const nextProject = isLastPeriod ? null : journeyStages[currentIndex + 1];
        
        // For prev: keep circular navigation or set null for first period
        const prevIndex = (currentIndex - 1 + journeyStages.length) % journeyStages.length;
        const prevProject = journeyStages[prevIndex];

        console.log('🎨 Generated Stage Data:', {
          currentStage: journeyStages[currentIndex]?.title,
          currentStageEvents: journeyStages[currentIndex]?.cards?.length || 0,
          currentStageImages: journeyStages[currentIndex]?.images?.length || 0,
          imagesPreview: journeyStages[currentIndex]?.images?.slice(0, 5),
          isLastPeriod,
          isFirstPeriod,
          allStages: journeyStages.map(s => ({ 
            title: s.title, 
            imageCount: s.images?.length || 0,
            cardCount: s.cards?.length || 0 
          }))
        });

        setStageData({
          project: journeyStages[currentIndex],
          nextProject: nextProject,
          prevProject: prevProject,
        });
      }
      setLoading(false);
    };

    loadExperienceData();
  }, [searchParams]);

  if (loading) {
    return <DarkLoadingScreen message="Loading your timeline..." />;
  }

  if (!stageData) {
    return (
      <DarkLoadingScreen 
        message="Your growth journey is being prepared" 
        subMessage="This is demo data. Please upload and process your WhatsApp chat for personalized insights."
      />
    );
  }

  return (
    <ProjectClient
      project={stageData.project}
      nextProject={stageData.nextProject}
      prevProject={stageData.prevProject}
    />
  );
}

export default function GrowthJourneyPage() {
  return (
    <Suspense fallback={<DarkLoadingScreen />}>
      <GrowthJourneyContent />
    </Suspense>
  );
}