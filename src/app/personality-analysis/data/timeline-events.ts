// Personality Analysis Timeline Events
// Significant personality discoveries and cognitive breakthroughs

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  emotion: string;
  intensity: number;
  description?: string;
}

export const PERSONALITY_TIMELINE_EVENTS: TimelineEvent[] = [
  { 
    id: '1', 
    title: 'Creative Problem Solving', 
    time: '14:30', 
    day: 'November 18th, 2024', 
    emotion: 'innovation', 
    intensity: 9, 
    description: 'Discovered novel approach to complex challenge - high openness to experience' 
  },
  { 
    id: '2', 
    title: 'Analytical Breakthrough', 
    time: '10:15', 
    day: 'November 22nd, 2024', 
    emotion: 'clarity', 
    intensity: 8, 
    description: 'Applied systematic thinking to solve multi-layered business problem' 
  },
  { 
    id: '3', 
    title: 'Authentic Communication', 
    time: '16:45', 
    day: 'November 26th, 2024', 
    emotion: 'connection', 
    intensity: 8, 
    description: 'Balanced direct honesty with diplomatic sensitivity in team discussion' 
  },
  { 
    id: '4', 
    title: 'Collaborative Innovation', 
    time: '11:30', 
    day: 'November 29th, 2024', 
    emotion: 'synergy', 
    intensity: 9, 
    description: 'Facilitated breakthrough team brainstorming session - strong collaborative style' 
  },
  { 
    id: '5', 
    title: 'Logical Decision Making', 
    time: '15:20', 
    day: 'December 2nd, 2024', 
    emotion: 'confidence', 
    intensity: 7, 
    description: 'Made critical strategic decision using systematic analysis under pressure' 
  },
  { 
    id: '6', 
    title: 'Emotional Intelligence', 
    time: '18:00', 
    day: 'December 5th, 2024', 
    emotion: 'empathy', 
    intensity: 8, 
    description: 'Demonstrated high emotional awareness in difficult family situation' 
  },
  { 
    id: '7', 
    title: 'Personality Integration', 
    time: '12:45', 
    day: 'December 8th, 2024', 
    emotion: 'authenticity', 
    intensity: 9, 
    description: 'Recognized and embraced unique combination of traits - self-acceptance milestone' 
  }
]; 