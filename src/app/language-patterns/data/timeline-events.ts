// Language Patterns Timeline Events
// Communication breakthrough moments with concise descriptions for graph visualization

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  emotion: string;
  intensity: number;
  description?: string;
}

export const LANGUAGE_TIMELINE_EVENTS: TimelineEvent[] = [
  { 
    id: '1', 
    title: 'Storytelling Mastery', 
    time: '15:30', 
    day: 'November 15th, 2024', 
    emotion: 'excitement', 
    intensity: 9, 
    description: 'Captivated audience with compelling narrative structure' 
  },
  { 
    id: '2', 
    title: 'Persuasive Excellence', 
    time: '11:45', 
    day: 'November 20th, 2024', 
    emotion: 'trust', 
    intensity: 8, 
    description: 'Achieved unanimous agreement using logical arguments' 
  },
  { 
    id: '3', 
    title: 'Humor Integration', 
    time: '13:20', 
    day: 'November 24th, 2024', 
    emotion: 'joy', 
    intensity: 8, 
    description: 'Perfect timing diffused tension and built rapport' 
  },
  { 
    id: '4', 
    title: 'Metaphor Clarity', 
    time: '09:15', 
    day: 'November 27th, 2024', 
    emotion: 'surprise', 
    intensity: 7, 
    description: 'Complex concept instantly clarified with simple analogy' 
  },
  { 
    id: '5', 
    title: 'Active Listening Win', 
    time: '16:40', 
    day: 'December 1st, 2024', 
    emotion: 'compassion', 
    intensity: 8, 
    description: 'Deep understanding reached in challenging conversation' 
  },
  { 
    id: '6', 
    title: 'Vocabulary Breakthrough', 
    time: '19:30', 
    day: 'December 4th, 2024', 
    emotion: 'anticipation', 
    intensity: 7, 
    description: 'Mastered sophisticated terminology for key presentation' 
  },
  { 
    id: '7', 
    title: 'Assertive Expression', 
    time: '14:10', 
    day: 'December 8th, 2024', 
    emotion: 'hope', 
    intensity: 8, 
    description: 'Clearly communicated needs with respect and clarity' 
  }
]; 