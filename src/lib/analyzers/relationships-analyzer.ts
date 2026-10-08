import { WhatsAppMessage } from '../parsers/whatsapp-parser';

export interface Relationship {
  name: string;
  messageCount: number;
  firstMessage: Date;
  lastMessage: Date;
  active: boolean;
}

export interface RelationshipsAnalysisResult {
  relationships: Relationship[];
  network: any[];
  summary: string;
}

export class RelationshipsAnalyzer {
  async analyzeRelationships(messages: WhatsAppMessage[], userName: string): Promise<RelationshipsAnalysisResult> {
    console.log('🤝 Analyzing relationships from', messages.length, 'messages');
    
    // Group messages by sender
    const senderMap = new Map<string, WhatsAppMessage[]>();
    
    messages.forEach(msg => {
      if (msg.sender && msg.sender !== userName) {
        if (!senderMap.has(msg.sender)) {
          senderMap.set(msg.sender, []);
        }
        senderMap.get(msg.sender)!.push(msg);
      }
    });
    
    // Create relationship objects
    const relationships: Relationship[] = Array.from(senderMap.entries()).map(([name, msgs]) => {
      const sortedMsgs = msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const lastMessageDate = sortedMsgs[sortedMsgs.length - 1].timestamp;
      const daysSinceLastMessage = (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24);
      
      return {
        name,
        messageCount: msgs.length,
        firstMessage: sortedMsgs[0].timestamp,
        lastMessage: lastMessageDate,
        active: daysSinceLastMessage < 30 // Active if messaged in last 30 days
      };
    });
    
    // Sort by message count
    relationships.sort((a, b) => b.messageCount - a.messageCount);
    
    console.log('🤝 Found', relationships.length, 'relationships');
    
    return {
      relationships,
      network: relationships, // Same data for now
      summary: `Analyzed conversations with ${relationships.length} people. Most active: ${relationships[0]?.name || 'None'}`
    };
  }
}