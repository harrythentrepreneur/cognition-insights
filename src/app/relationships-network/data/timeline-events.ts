// Relationships Network Timeline Events
// Significant social connections and communication breakthroughs

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  day: string;
  emotion: string;
  intensity: number;
  description?: string;
}

export const RELATIONSHIP_TIMELINE_EVENTS: TimelineEvent[] = [
  { 
    id: '1', 
    title: 'Deep Connection Moment', 
    time: '20:15', 
    day: 'November 12th, 2024', 
    emotion: 'intimacy', 
    intensity: 9, 
    description: 'Shared vulnerable moment with partner - relationship depth significantly increased' 
  },
  { 
    id: '2', 
    title: 'Conflict Resolution Win', 
    time: '17:30', 
    day: 'November 16th, 2024', 
    emotion: 'harmony', 
    intensity: 8, 
    description: 'Successfully mediated team conflict using empathy and active listening' 
  },
  { 
    id: '3', 
    title: 'Network Expansion', 
    time: '12:45', 
    day: 'November 21st, 2024', 
    emotion: 'excitement', 
    intensity: 7, 
    description: 'Made meaningful professional connection at industry event - promising collaboration' 
  },
  { 
    id: '4', 
    title: 'Mentorship Moment', 
    time: '14:20', 
    day: 'November 26th, 2024', 
    emotion: 'fulfillment', 
    intensity: 8, 
    description: 'Provided valuable guidance to junior colleague - significant impact achieved' 
  },
  { 
    id: '5', 
    title: 'Boundary Setting', 
    time: '19:45', 
    day: 'November 30th, 2024', 
    emotion: 'empowerment', 
    intensity: 7, 
    description: 'Established healthy boundaries in challenging relationship - self-respect maintained' 
  },
  { 
    id: '6', 
    title: 'Community Building', 
    time: '11:00', 
    day: 'December 4th, 2024', 
    emotion: 'belonging', 
    intensity: 8, 
    description: 'Organized successful neighborhood gathering - strengthened community bonds' 
  },
  { 
    id: '7', 
    title: 'Empathy Breakthrough', 
    time: '16:30', 
    day: 'December 8th, 2024', 
    emotion: 'compassion', 
    intensity: 9, 
    description: 'Extended genuine understanding to difficult family member - relationship healing began' 
  }
]; 