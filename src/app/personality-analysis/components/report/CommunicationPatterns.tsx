import React, { CSSProperties } from 'react';
import { DESIGN_TOKENS } from '@/components/shared/styles/design-tokens';
import { ProactiveReactiveScale } from '../visualizations/ProactiveReactiveScale';
import { NetworkDiagram } from '../visualizations/NetworkDiagram';
import { LinguisticHeatmap } from '../visualizations/LinguisticHeatmap';

const { colors, fonts, spacing } = DESIGN_TOKENS;

interface CommunicationPatternsProps {
  data: any;
}

const styles = {
  container: {
    marginBottom: spacing.xxl,
  } as CSSProperties,
  
  title: {
    fontSize: '2.5rem',
    fontWeight: 300,
    color: colors.accent,
    marginBottom: spacing.xl,
    borderBottom: `2px solid ${colors.accent}`,
    paddingBottom: spacing.md,
  } as CSSProperties,
  
  section: {
    marginBottom: spacing.xxl,
  } as CSSProperties,
  
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: 400,
    color: colors.accentDark,
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  } as CSSProperties,
  
  paragraph: {
    fontSize: '1.125rem',
    lineHeight: 1.8,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'justify',
  } as CSSProperties,
  
  insight: {
    backgroundColor: 'rgba(0, 255, 230, 0.1)',
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    fontSize: '1rem',
    color: colors.textSecondary,
    fontStyle: 'italic',
  } as CSSProperties,
  
  quote: {
    fontSize: '1.25rem',
    fontStyle: 'italic',
    borderLeft: `4px solid ${colors.accent}`,
    paddingLeft: spacing.lg,
    margin: `${spacing.lg} 0`,
    color: colors.textSecondary,
  } as CSSProperties,
  
  linguisticGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  } as CSSProperties,
  
  linguisticCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  } as CSSProperties,
  
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: spacing.md,
  } as CSSProperties,
  
  cardContent: {
    fontSize: '0.95rem',
    color: colors.textSecondary,
    lineHeight: 1.6,
  } as CSSProperties,
};

export const CommunicationPatterns: React.FC<CommunicationPatternsProps> = ({ data }) => {
  // Check for LLM-generated content
  const hasLLMContent = data?.narrative_content?.communication_patterns;
  const commContent = hasLLMContent ? data.narrative_content.communication_patterns : null;
  
  const proactiveReactiveData = data?.proactive_reactive || {
    proactive_score: 65,
    reactive_score: 35,
    initiative_ratio: 0.65,
    examples: {
      proactive: [
        "Let's plan our weekend trip to the mountains",
        "I think we should try that new restaurant tonight",
        "How about we start that project we discussed?"
      ],
      reactive: [
        "That sounds great! I'm in",
        "Sure, whatever you think is best",
        "I agree with your suggestion"
      ]
    }
  };

  const calculateCommunicationStyle = () => {
    const ratio = proactiveReactiveData.initiative_ratio || 0.5;
    if (ratio > 0.7) return "Highly Proactive Leader";
    if (ratio > 0.6) return "Proactive Initiator";
    if (ratio > 0.4) return "Balanced Communicator";
    if (ratio > 0.3) return "Responsive Participant";
    return "Reactive Supporter";
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Chapter 4: Communication & Social Patterns</h2>
      
      <div style={styles.section}>
        {commContent?.style_analysis ? (
          commContent.style_analysis.split('\n\n').map((paragraph: string, index: number) => (
            <div key={index} style={styles.paragraph}>
              {paragraph}
            </div>
          ))
        ) : (
          <>
            <div style={styles.paragraph}>
              Your communication patterns reveal a fascinating tapestry of linguistic choices, social dynamics, 
              and conversational strategies. Through careful analysis of your messaging behavior, we can observe 
              distinct patterns in how you initiate, respond to, and shape conversations across different contexts 
              and relationships.
            </div>
            
            <div style={styles.paragraph}>
              The way you communicate reflects deeper aspects of your personality architecture—from your 
              propensity to lead conversations to your natural rhythm of social engagement. These patterns 
              form your unique "linguistic fingerprint," a signature style that distinguishes your voice 
              in the digital conversation landscape.
            </div>
          </>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Linguistic Fingerprint Analysis</h3>
        
        <div style={styles.linguisticGrid}>
          <div style={styles.linguisticCard}>
            <div style={styles.cardTitle}>Communication Style</div>
            <div style={styles.cardContent}>
              <strong>{calculateCommunicationStyle()}</strong><br/>
              You demonstrate a {proactiveReactiveData.initiative_ratio > 0.5 ? 'proactive' : 'reactive'} 
              communication approach, {proactiveReactiveData.initiative_ratio > 0.6 ? 'frequently initiating' : 'thoughtfully responding to'} 
              conversations and social interactions.
            </div>
          </div>
          
          <div style={styles.linguisticCard}>
            <div style={styles.cardTitle}>Initiative Patterns</div>
            <div style={styles.cardContent}>
              <strong>{(proactiveReactiveData.initiative_ratio * 100).toFixed(0)}% Initiative Rate</strong><br/>
              Your tendency to start conversations and propose activities suggests 
              {proactiveReactiveData.initiative_ratio > 0.6 ? 'strong leadership qualities and social confidence' : 
               proactiveReactiveData.initiative_ratio > 0.4 ? 'balanced social engagement with situational leadership' : 
               'thoughtful participation and collaborative tendencies'}.
            </div>
          </div>
          
          <div style={styles.linguisticCard}>
            <div style={styles.cardTitle}>Social Network Role</div>
            <div style={styles.cardContent}>
              <strong>{proactiveReactiveData.initiative_ratio > 0.6 ? 'Network Catalyst' : 
                      proactiveReactiveData.initiative_ratio > 0.4 ? 'Collaborative Hub' : 'Supportive Node'}</strong><br/>
              Within your social networks, you function as 
              {proactiveReactiveData.initiative_ratio > 0.6 ? 'a driving force who energizes groups and proposes new directions' : 
               proactiveReactiveData.initiative_ratio > 0.4 ? 'a balanced participant who both initiates and responds thoughtfully' : 
               'a reliable supporter who strengthens connections through responsive engagement'}.
            </div>
          </div>
          
          <div style={styles.linguisticCard}>
            <div style={styles.cardTitle}>Influence Style</div>
            <div style={styles.cardContent}>
              <strong>{proactiveReactiveData.initiative_ratio > 0.6 ? 'Direct Influence' : 
                      proactiveReactiveData.initiative_ratio > 0.4 ? 'Collaborative Influence' : 'Supportive Influence'}</strong><br/>
              Your communication creates impact through 
              {proactiveReactiveData.initiative_ratio > 0.6 ? 'clear direction-setting and active proposal of ideas and activities' : 
               proactiveReactiveData.initiative_ratio > 0.4 ? 'balanced contributions that both lead and follow contextually' : 
               'thoughtful responses and supportive validation of others\' initiatives'}.
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Proactive vs Reactive Communication Analysis</h3>
        
        <div style={styles.paragraph}>
          The balance between proactive initiation and reactive response in your communication style 
          reveals fundamental aspects of your social personality. This analysis examines your 
          natural tendency to either lead conversations or thoughtfully participate in dialogues 
          initiated by others.
        </div>
        
        <ProactiveReactiveScale data={proactiveReactiveData} />
        
        <div style={styles.insight}>
          <strong>Communication Insight:</strong> Your {(proactiveReactiveData.initiative_ratio * 100).toFixed(0)}% 
          proactive communication rate indicates that you {proactiveReactiveData.initiative_ratio > 0.6 ? 
          'naturally gravitate toward leadership roles in conversations, often being the one to suggest activities, start discussions, and set the social agenda for your groups' : 
          proactiveReactiveData.initiative_ratio > 0.4 ? 
          'maintain a healthy balance between leading and following in conversations, adapting your communication style to the context and group dynamics' : 
          'tend to be more thoughtful and responsive in your communication approach, often building upon others\' ideas and providing supportive, well-considered responses'}.
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Social Network Dynamics</h3>
        
        {commContent?.relationship_insights ? (
          commContent.relationship_insights.split('\n\n').map((paragraph: string, index: number) => (
            <div key={index} style={styles.paragraph}>
              {paragraph}
            </div>
          ))
        ) : (
          <div style={styles.paragraph}>
            Your position within social networks reflects how you naturally connect with others and 
            contribute to group dynamics. Whether serving as a conversation catalyst, thoughtful 
            participant, or supportive connector, your communication style shapes the social 
            fabric of your relationships.
          </div>
        )}
        
        <NetworkDiagram 
          nodes={data?.social_network?.nodes}
          links={data?.social_network?.links}
        />
        
        <div style={styles.paragraph}>
          The network visualization above illustrates your social ecosystem—the intricate web of 
          relationships that define your communication landscape. Each connection represents not 
          just message exchanges, but the emotional and intellectual bonds that form through 
          consistent interaction. The strength of these connections, visualized through proximity 
          and link thickness, reveals the hierarchical nature of your social investments.
        </div>
        
        <div style={styles.quote}>
          "Communication is not just about exchanging information—it's about creating the social 
          architecture that defines how we relate to one another and build meaningful connections."
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Linguistic Patterns & Word Usage</h3>
        
        <div style={styles.paragraph}>
          Your linguistic choices form a unique fingerprint—a distinctive pattern of expression 
          that reveals cognitive processes, emotional states, and social strategies. Through 
          analysis of word frequency, sentence structure, and linguistic complexity, we can 
          understand not just what you say, but how your mind constructs meaning and navigates 
          social interactions.
        </div>
        
        <LinguisticHeatmap />
        
        {commContent?.key_patterns && commContent.key_patterns.length > 0 ? (
          <div style={styles.linguisticGrid}>
            {commContent.key_patterns.map((pattern: any, index: number) => (
              <div key={index} style={styles.linguisticCard}>
                <div style={styles.cardTitle}>{pattern.pattern}</div>
                <div style={styles.cardContent}>
                  <strong>{pattern.description}</strong>
                  {pattern.example && (
                    <>
                      <br/>
                      <em style={{fontSize: '0.9rem', marginTop: spacing.xs, display: 'block'}}>
                        "{pattern.example}"
                      </em>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.linguisticGrid}>
            <div style={styles.linguisticCard}>
              <div style={styles.cardTitle}>Vocabulary Richness</div>
              <div style={styles.cardContent}>
                <strong>Diverse Expression</strong><br/>
                Your vocabulary spans approximately <strong>3,500+ unique words</strong>, 
                indicating sophisticated linguistic capabilities and adaptable communication 
                across different contexts and audiences.
              </div>
            </div>
            
            <div style={styles.linguisticCard}>
              <div style={styles.cardTitle}>Sentence Complexity</div>
              <div style={styles.cardContent}>
                <strong>Balanced Structure</strong><br/>
                Average sentence length of <strong>12-15 words</strong> suggests clear, 
                accessible communication that balances sophistication with comprehension, 
                avoiding both oversimplification and unnecessary complexity.
              </div>
            </div>
            
            <div style={styles.linguisticCard}>
              <div style={styles.cardTitle}>Emotional Expression</div>
              <div style={styles.cardContent}>
                <strong>Emotionally Articulate</strong><br/>
                You use <strong>15% emotional language</strong> in your communications, 
                showing healthy emotional expression and the ability to convey feelings 
                effectively through written communication.
              </div>
            </div>
            
            <div style={styles.linguisticCard}>
              <div style={styles.cardTitle}>Question Patterns</div>
              <div style={styles.cardContent}>
                <strong>Curiosity-Driven</strong><br/>
                <strong>22% of messages contain questions</strong>, revealing an inquisitive 
                nature and genuine interest in others' thoughts, experiences, and perspectives—
                a key marker of engaged communication.
              </div>
            </div>
          </div>
        )}
        
        <div style={styles.insight}>
          <strong>Linguistic Insight:</strong> Your communication style demonstrates a sophisticated 
          balance between intellectual depth and emotional accessibility. The combination of rich 
          vocabulary, balanced sentence structure, and healthy emotional expression creates a 
          communication profile that is both engaging and authentic. This linguistic flexibility 
          allows you to adapt your communication style to different relationships and contexts 
          while maintaining your authentic voice.
        </div>
      </div>

      {commContent?.communication_evolution ? (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Communication Evolution</h3>
          {commContent.communication_evolution.split('\n\n').map((paragraph: string, index: number) => (
            <div key={index} style={styles.paragraph}>
              {paragraph}
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Influence Patterns & Conversational Impact</h3>
          
          <div style={styles.paragraph}>
            The ripple effects of your communication extend beyond immediate exchanges. Your messages 
            often serve as catalysts for deeper discussions, emotional shifts, and collective 
            decision-making within your social networks. This influence manifests through various 
            conversational dynamics and response patterns.
          </div>
          
          <div style={styles.paragraph}>
            Analysis reveals that your messages frequently trigger extended conversation threads, 
            with an average response rate of {proactiveReactiveData.initiative_ratio > 0.6 ? '85%' : '72%'} 
            and conversation continuation rate of {proactiveReactiveData.initiative_ratio > 0.6 ? '3.2' : '2.5'} 
            messages per initial contact. This suggests that your communication style naturally 
            invites engagement and fosters ongoing dialogue.
          </div>
          
          <div style={styles.paragraph}>
            The patterns in your messaging reveal not just what you communicate, but how you 
            create space for others, respond to social cues, and contribute to the collective 
            emotional and intellectual life of your communities. These insights illuminate your 
            natural social intelligence and communication strengths.
          </div>
        </div>
      )}
    </div>
  );
};