/**
 * JSON schemas for structured output from Gemini API
 * These schemas define the exact structure expected from each analyzer
 * Note: Only using properties supported by Gemini's structured output
 */

// Schema for EmotionalAnalyzer output
export const EMOTIONAL_ANALYSIS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      week: {
        type: "string",
        description: "Week start date in YYYY-MM-DD format"
      },
      // Core emotional states (16)
      joy: { type: "number" },
      sadness: { type: "number" },
      anger: { type: "number" },
      fear: { type: "number" },
      surprise: { type: "number" },
      love: { type: "number" },
      disgust: { type: "number" },
      anticipation: { type: "number" },
      trust: { type: "number" },
      confusion: { type: "number" },
      excitement: { type: "number" },
      calm: { type: "number" },
      hope: { type: "number" },
      frustration: { type: "number" },
      gratitude: { type: "number" },
      compassion: { type: "number" },
      // Growth & personal development traits (24)
      mental_strength: { type: "number" },
      mindfulness: { type: "number" },
      impulse_control: { type: "number" },
      willpower: { type: "number" },
      deep_focus: { type: "number" },
      daily_habits: { type: "number" },
      emotional_mastery: { type: "number" },
      stress_control: { type: "number" },
      authenticity: { type: "number" },
      empathy: { type: "number" },
      boundaries: { type: "number" },
      flow_state: { type: "number" },
      learning_speed: { type: "number" },
      resilience: { type: "number" },
      inner_wisdom: { type: "number" },
      self_discipline: { type: "number" },
      creativity: { type: "number" },
      patience: { type: "number" },
      confidence: { type: "number" },
      adaptability: { type: "number" },
      weekly_summary: {
        type: "array",
        items: { type: "string" },
        description: "Exactly 3 brief, specific bullet points about this week"
      },
      weekly_topics: {
        type: "array",
        items: { type: "string" },
        description: "Exactly 3 main discussion themes from this week"
      },
      contributing_people: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of people involved in conversations"
      }
    },
    required: [
      "week",
      // All 40 emotional metrics are required
      "joy", "sadness", "anger", "fear", "surprise", "love", "disgust", "anticipation",
      "trust", "confusion", "excitement", "calm", "hope", "frustration", "gratitude", "compassion",
      "mental_strength", "mindfulness", "impulse_control", "willpower", "deep_focus", "daily_habits",
      "emotional_mastery", "stress_control", "authenticity", "empathy", "boundaries", "flow_state",
      "learning_speed", "resilience", "inner_wisdom", "self_discipline", "creativity", "patience",
      "confidence", "adaptability",
      "weekly_summary", "weekly_topics"
    ]
  }
};

// Schema for TimelineEventsAnalyzerEnhanced output  
export const TIMELINE_EVENTS_SCHEMA = {
  type: "object",
  properties: {
    chapters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Chapter name"
          },
          description: {
            type: "string",
            description: "Chapter description"
          }
        },
        required: ["name", "description"]
      },
      description: "Array of chapters with names and descriptions"
    },
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique event identifier"
          },
          title: {
            type: "string",
            description: "Short, descriptive title for the event"
          },
          time: {
            type: "string",
            description: "Date in format 'Month DD, YYYY'"
          },
          day: {
            type: "string",
            description: "Chapter name this event belongs to"
          },
          emotion: {
            type: "string",
            description: "Primary emotion: hope, joy, love, courage, pride, curiosity, confusion, stress, fear, or concern"
          },
          intensity: {
            type: "number",
            description: "Emotional intensity score from 1-10"
          },
          description: {
            type: "string",
            description: "Rich, detailed first-person description (150-300 chars)"
          }
        },
        required: ["id", "title", "time", "day", "emotion", "intensity", "description"]
      }
    }
  },
  required: ["chapters", "events"]
};

// Schema for BehavioralReflectionsAnalyzer output
export const BEHAVIORAL_REFLECTIONS_SCHEMA = {
  type: "object",
  properties: {
    habitImpacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          habit: {
            type: "string",
            description: "Name or description of the habit"
          },
          impact: {
            type: "string",
            description: "Description of how this habit impacts behavior"
          },
          frequency: {
            type: "string",
            description: "How often this habit occurs: daily, weekly, monthly, occasionally, or rarely"
          },
          emotional_connection: {
            type: "string",
            description: "How this habit connects to emotions"
          },
          growth_potential: {
            type: "number",
            description: "Potential for positive change (1-10)"
          }
        },
        required: ["habit", "impact", "frequency", "emotional_connection", "growth_potential"]
      }
    },
    patterns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Description of the behavioral pattern"
          },
          triggers: {
            type: "array",
            items: { type: "string" },
            description: "What triggers this pattern"
          },
          outcomes: {
            type: "array",
            items: { type: "string" },
            description: "Common outcomes of this pattern"
          },
          strength: {
            type: "number",
            description: "How strong/consistent this pattern is (1-10)"
          }
        },
        required: ["pattern", "triggers", "outcomes", "strength"]
      }
    },
    insights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          insight: {
            type: "string",
            description: "Key behavioral insight"
          },
          evidence: {
            type: "string",
            description: "Supporting evidence from conversations"
          },
          relevance: {
            type: "number",
            description: "How relevant this insight is (1-10)"
          },
          actionable: {
            type: "boolean",
            description: "Whether this insight can lead to actionable change"
          }
        },
        required: ["insight", "evidence", "relevance", "actionable"]
      }
    }
  },
  required: ["habitImpacts", "patterns", "insights"]
};

// Schema for PersonalityAnalyzer output
export const PERSONALITY_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    bigFive: {
      type: "object",
      properties: {
        openness: { type: "number", description: "Openness to experience score (1-100)" },
        conscientiousness: { type: "number", description: "Conscientiousness score (1-100)" },
        extraversion: { type: "number", description: "Extraversion score (1-100)" },
        agreeableness: { type: "number", description: "Agreeableness score (1-100)" },
        neuroticism: { type: "number", description: "Neuroticism score (1-100)" }
      },
      required: ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
    },
    dominantTraits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          trait: { type: "string", description: "Name of the personality trait" },
          score: { type: "number", description: "Trait score (1-100)" },
          description: { type: "string", description: "Description of the trait" },
          evidence: {
            type: "array",
            items: { type: "string" },
            description: "Supporting evidence from conversations"
          }
        },
        required: ["trait", "score", "description", "evidence"]
      }
    },
    personalityType: { type: "string", description: "Overall personality type classification" },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "List of personality strengths"
    },
    growthAreas: {
      type: "array",
      items: { type: "string" },
      description: "Areas for personal growth"
    },
    communicationStyle: {
      type: "object",
      properties: {
        primary: { type: "string", description: "Primary communication style" },
        characteristics: {
          type: "array",
          items: { type: "string" },
          description: "Communication characteristics"
        }
      },
      required: ["primary", "characteristics"]
    },
    emotionalPattern: {
      type: "object",
      properties: {
        stability: { type: "number", description: "Emotional stability score (1-100)" },
        expressiveness: { type: "number", description: "Emotional expressiveness score (1-100)" },
        depth: { type: "number", description: "Emotional depth score (1-100)" }
      },
      required: ["stability", "expressiveness", "depth"]
    }
  },
  required: ["bigFive", "dominantTraits", "personalityType", "strengths", "growthAreas", "communicationStyle", "emotionalPattern"]
};

// Schema for Big Five personality traits only
export const BIG_FIVE_SCHEMA = {
  type: "object",
  properties: {
    openness: { type: "number", description: "Openness to experience score (1-100)" },
    conscientiousness: { type: "number", description: "Conscientiousness score (1-100)" },
    extraversion: { type: "number", description: "Extraversion score (1-100)" },
    agreeableness: { type: "number", description: "Agreeableness score (1-100)" },
    neuroticism: { type: "number", description: "Neuroticism score (1-100)" }
  },
  required: ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
};

// Schema for personality insights array
export const PERSONALITY_INSIGHTS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      trait: { type: "string", description: "Name of the personality trait" },
      score: { type: "number", description: "Trait score (1-100)" },
      description: { type: "string", description: "Description of the trait" },
      evidence: {
        type: "array",
        items: { type: "string" },
        description: "Supporting evidence from conversations"
      }
    },
    required: ["trait", "score", "description", "evidence"]
  }
};

// Schema for communication patterns
export const COMMUNICATION_PATTERNS_SCHEMA = {
  type: "object",
  properties: {
    communicationStyle: {
      type: "object",
      properties: {
        primary: { type: "string", description: "Primary communication style" },
        characteristics: {
          type: "array",
          items: { type: "string" },
          description: "Communication characteristics"
        }
      },
      required: ["primary", "characteristics"]
    },
    emotionalPattern: {
      type: "object",
      properties: {
        stability: { type: "number", description: "Emotional stability score (1-100)" },
        expressiveness: { type: "number", description: "Emotional expressiveness score (1-100)" },
        depth: { type: "number", description: "Emotional depth score (1-100)" }
      },
      required: ["stability", "expressiveness", "depth"]
    }
  },
  required: ["communicationStyle", "emotionalPattern"]
};

// Schema for strengths and growth areas
export const STRENGTHS_GROWTH_SCHEMA = {
  type: "object",
  properties: {
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "List of personality strengths"
    },
    growthAreas: {
      type: "array",
      items: { type: "string" },
      description: "Areas for personal growth"
    }
  },
  required: ["strengths", "growthAreas"]
};

// Schema for TriggersAnalyzer output
export const TRIGGERS_ANALYSIS_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      trigger: { type: "string", description: "Description of the emotional trigger" },
      category: {
        type: "string",
        description: "Category of the trigger: emotional, behavioral, cognitive, or social",
        enum: ["emotional", "behavioral", "cognitive", "social"]
      },
      intensity: { type: "number", description: "Intensity level of the trigger (1-10)" },
      frequency: { type: "number", description: "How often this trigger occurs (1-10)" },
      context: { type: "string", description: "Context or situation where this trigger occurs" },
      examples: {
        type: "array",
        items: { type: "string" },
        description: "Specific examples from conversations"
      }
    },
    required: ["trigger", "category", "intensity", "frequency", "context", "examples"]
  }
};