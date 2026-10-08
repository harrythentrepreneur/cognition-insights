import { PersonalityTrait, BehavioralPattern, PersonalityTimelineEvent, PersonalityInsight } from './constants';
import { HabitImpact } from '../../components/shared/types/insights';
import { TimelineEvent } from '../../components/shared/types/timeline';

export const transformPersonalityToHabitImpact = (traits: PersonalityTrait[]): HabitImpact[] => {
  return traits.map(trait => ({
    id: trait.id,
    habit: trait.name,
    impact: trait.score > 50 ? trait.score : -(100 - trait.score), // Transform to positive/negative impact
    category: trait.category,
    description: trait.description,
  }));
};

export const transformBehavioralToTimelineEvent = (patterns: BehavioralPattern[]): TimelineEvent[] => {
  return patterns.map(pattern => ({
    id: pattern.id,
    title: pattern.pattern,
    time: '', // Behavioral patterns don't have a time
    day: pattern.context.join(', '),
    emotion: pattern.trend,
    intensity: pattern.intensity,
    description: `Frequency: ${pattern.frequency}`,
  }));
};

// Transform personality timeline events into the format expected by BaseEventsTimeline
export const transformPersonalityTimelineEvents = (events: PersonalityTimelineEvent[]): TimelineEvent[] => {
  return events.map(event => ({
    id: event.id,
    title: event.title,
    time: event.time,
    day: event.day,
    emotion: event.personalityTrait, // Map personality trait to emotion field
    intensity: event.intensity,
    description: event.description
  }));
};

// Transform personality insights into habit impact format for comprehensive data
export const transformInsightData = (insights: PersonalityInsight[]) => {
  return insights.map(insight => ({
    id: insight.id,
    habit: insight.category,
    impact: insight.confidence,
    category: 'insight' as const,
    description: insight.insight
  }));
};

// Transform personality habit impacts to insights format for clearer reflections
export const transformPersonalityHabitsToInsights = (habits: any[]): HabitImpact[] => {
  return habits.map(habit => ({
    id: habit.id,
    habit: habit.habit,
    impact: habit.impact,
    category: habit.category,
    description: habit.description
  }));
}; 