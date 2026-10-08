import { useState, useEffect, useMemo, useCallback } from 'react';
import { RelationshipCard, RelationshipScorecard } from '../types';
import { MOCK_RELATIONSHIP_CARDS } from '../constants';
import {
  calculateHealthScore,
  calculateBalanceScore,
  calculateReciprocityScore,
  calculateFrequencyScore,
  transformApiDataToRelationshipCards
} from '../utils';
// Backend API removed - using IndexedDB storage
import { IndexedDBStorage } from '@/lib/storage/indexed-db';

interface UseRelationshipScoringProps {
  sessionId?: string;
  useMockData?: boolean;
}

interface UseRelationshipScoringReturn {
  cards: RelationshipCard[];
  loading: boolean;
  error: string | null;
  selectedCard: RelationshipCard | null;
  setSelectedCard: (card: RelationshipCard | null) => void;
  refreshData: () => Promise<void>;
}

export const useRelationshipScoring = (
  sessionId?: string,
  useMockData = false
) => {
  const [cards, setCards] = useState<RelationshipCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<RelationshipCard | null>(null);

  const fetchRelationshipData = useCallback(async () => {
    console.log('[RELATIONSHIP-SCORING] Hook params:', { sessionId, useMockData });

    if (useMockData || !sessionId) {
      console.log('[RELATIONSHIP-SCORING] Using mock data - useMockData:', useMockData, 'sessionId:', sessionId);
      // Use mock data for development
      setCards(MOCK_RELATIONSHIP_CARDS);
      return;
    }

    console.log('[RELATIONSHIP-SCORING] Starting API fetch for session:', sessionId);
    setLoading(true);
    setError(null);

    try {
      // Fetch from IndexedDB instead of API
      console.log('[RELATIONSHIP-SCORING] Fetching from IndexedDB for session:', sessionId);

      const storage = new IndexedDBStorage();
      await storage.initialize();
      const result = await storage.getAnalysisResult(sessionId);

      if (!result) {
        throw new Error('No analysis results found in IndexedDB');
      }

      console.log('[RELATIONSHIP-SCORING] IndexedDB result:', {
        hasRelationships: !!result.relationships,
        relationshipCount: result.relationships?.relationships?.length
      });

      // Transform IndexedDB data to match the old API format
      if (result.relationships && result.relationships.relationships) {
        const relationshipsData = {
          status: 'completed',
          relationships_data: {
            relationships: result.relationships.relationships,
            network: result.relationships.network || result.relationships.relationships,
            summary: result.relationships.summary
          }
        };

        // Transform to relationship cards
        let transformedCards = transformApiDataToRelationshipCards(relationshipsData.relationships_data);

        // Message counts are already in the relationships data from IndexedDB
        console.log('[RELATIONSHIP-SCORING] Using message counts from IndexedDB relationships data');

        setCards(transformedCards);
      } else {
        console.log('No relationships data found in IndexedDB');
        setError('No relationships data available');
        // Use mock data as fallback
        setCards(MOCK_RELATIONSHIP_CARDS);
      }
    } catch (err) {
      console.error('Error fetching relationship data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Fallback to mock data on error
      setCards(MOCK_RELATIONSHIP_CARDS);
    } finally {
      setLoading(false);
    }
  }, [sessionId, useMockData]);

  const refreshData = async () => {
    await fetchRelationshipData();
  };

  // Initial data fetch
  useEffect(() => {
    fetchRelationshipData();
  }, [fetchRelationshipData]);

  // Memoized calculations for performance
  const memoizedCards = useMemo(() => {
    return cards.map(card => ({
      ...card,
      scorecard: {
        ...card.scorecard,
        healthScore: calculateHealthScore(
          card.scorecard.balance,
          card.scorecard.reciprocity,
          card.scorecard.frequency
        )
      }
    }));
  }, [cards]);

  return {
    cards: memoizedCards,
    loading,
    error,
    selectedCard,
    setSelectedCard,
    refreshData
  };
};

// Helper hook for individual scorecard calculations
export const useRelationshipMetrics = (
  messageData: {
    sent: number;
    received: number;
    initiationRatio: number;
    supportGiven: number;
    supportReceived: number;
    emotionalAlignment: number;
    averageDaily: number;
    consistency: number;
  }
) => {
  return useMemo(() => {
    const balance = calculateBalanceScore(
      messageData.sent,
      messageData.received,
      messageData.initiationRatio
    );

    const reciprocity = calculateReciprocityScore(
      messageData.supportGiven,
      messageData.supportReceived,
      messageData.emotionalAlignment
    );

    const frequency = calculateFrequencyScore(
      messageData.averageDaily,
      messageData.consistency
    );

    const healthScore = calculateHealthScore(balance, reciprocity, frequency);

    return {
      balance,
      reciprocity,
      frequency,
      healthScore
    };
  }, [messageData]);
};