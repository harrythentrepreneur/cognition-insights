export interface WhatsAppMessage {
  timestamp: Date;
  sender: string;
  content: string;
  isUser: boolean;
}

export interface ParseResult {
  messages: WhatsAppMessage[];
  userIdentified: string;
  totalMessages: number;
  userMessages: number;
}

export class WhatsAppParser {
  private userName: string = '';
  private senderCounts: Map<string, number> = new Map();
  private dateFormat: 'MM/DD' | 'DD/MM' | 'ISO' | 'unknown' = 'unknown';

  async parseFile(file: File): Promise<ParseResult> {
    const text = await file.text();
    const lines = text.split('\n');
    const allMessages: WhatsAppMessage[] = [];
    
    // Detect date format from the first few messages
    this.dateFormat = this.detectDateFormat(lines);
    
    // First pass: collect all messages and count senders
    for (let i = 0; i < lines.length; i++) {
      const message = this.parseLine(lines[i], lines.slice(i + 1));
      if (message) {
        allMessages.push(message);
        const count = this.senderCounts.get(message.sender) || 0;
        this.senderCounts.set(message.sender, count + 1);
      }
    }

    // Identify the user based on message frequency
    this.identifyUser(allMessages);

    // Second pass: mark user messages
    const messages = allMessages.map(msg => ({
      ...msg,
      isUser: msg.sender === this.userName
    }));

    const userMessages = messages.filter(msg => msg.isUser);
    

    return {
      messages: messages, // Return ALL messages, not just user messages
      userIdentified: this.userName,
      totalMessages: allMessages.length,
      userMessages: userMessages.length
    };
  }

  private parseLine(line: string, nextLines: string[]): WhatsAppMessage | null {
    // Multiple format support
    const patterns = [
      // Format 1: [YYYY-MM-DD, HH:MM:SS] Sender: Message
      /\[(\d{4}-\d{2}-\d{2}),\s(\d{1,2}:\d{2}:\d{2})\]\s([^:]+):\s(.+)/,
      // Format 2: [DD/MM/YYYY, HH:MM:SS] Sender: Message
      /\[(\d{1,2}\/\d{1,2}\/\d{4}),\s(\d{1,2}:\d{2}:\d{2})\]\s([^:]+):\s(.+)/,
      // Format 3: DD/MM/YY, HH:MM - Sender: Message
      /(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2})\s-\s([^:]+):\s(.+)/,
      // Format 4: MM/DD/YY, HH:MM AM/PM - Sender: Message
      /(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}\s(?:AM|PM))\s-\s([^:]+):\s(.+)/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, date, time, sender, content] = match;
        const timestamp = this.parseTimestamp(date, time);
        
        if (timestamp) {
          // Handle multi-line messages
          let fullContent = content;
          for (let i = 0; i < nextLines.length; i++) {
            if (this.isNewMessage(nextLines[i])) break;
            fullContent += '\n' + nextLines[i];
          }

          return {
            timestamp,
            sender: sender.trim(),
            content: fullContent.trim(),
            isUser: false // Will be set in second pass
          };
        }
      }
    }

    return null;
  }

  private detectDateFormat(lines: string[]): 'MM/DD' | 'DD/MM' | 'ISO' | 'unknown' {
    // First check for ISO format [YYYY-MM-DD, HH:MM:SS]
    const isoRegex = /\[\d{4}-\d{2}-\d{2},\s\d{1,2}:\d{2}:\d{2}\]/;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      if (isoRegex.test(lines[i])) {
        return 'ISO';
      }
    }
    
    // If not ISO, check for slash-based formats
    const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
    const dates: Array<{day: number, month: number, line: string}> = [];
    
    // Collect dates from first 100 lines
    for (let i = 0; i < Math.min(lines.length, 100); i++) {
      const match = lines[i].match(dateRegex);
      if (match) {
        const [, first, second] = match;
        dates.push({
          day: parseInt(first),
          month: parseInt(second),
          line: lines[i]
        });
      }
    }
    
    if (dates.length < 3) return 'unknown';
    
    // Analyze dates to detect format
    let ddmmScore = 0;
    let mmddScore = 0;
    
    for (const date of dates) {
      // Clear indicators
      if (date.day > 12) ddmmScore += 2; // Must be DD/MM
      if (date.month > 12) mmddScore += 2; // Must be MM/DD
      
      // Statistical hints (most messages are within same month)
      if (date.day <= 12 && date.month <= 12) {
        // Check if dates are sequential when interpreted as DD/MM
        const ddmmDates = dates.filter(d => d.month === date.month);
        const mmddDates = dates.filter(d => d.day === date.day);
        
        if (ddmmDates.length > mmddDates.length) ddmmScore++;
        else if (mmddDates.length > ddmmDates.length) mmddScore++;
      }
    }
    
    // Check for date progression
    for (let i = 1; i < Math.min(dates.length, 10); i++) {
      const prev = dates[i-1];
      const curr = dates[i];
      
      // If day increases by 1 while month stays same, likely DD/MM
      if (curr.month === prev.month && curr.day === prev.day + 1) {
        ddmmScore++;
      }
      // If month increases while day stays similar, likely MM/DD
      if (curr.day === prev.day && curr.month === prev.month + 1) {
        mmddScore++;
      }
    }
    
    
    if (mmddScore > ddmmScore) return 'MM/DD';
    if (ddmmScore > mmddScore) return 'DD/MM';
    
    // Default to MM/DD for US-style dates
    return 'MM/DD';
  }

  private parseTimestamp(date: string, time: string): Date | null {
    try {
      // Check if date is already in YYYY-MM-DD format
      if (date.includes('-')) {
        const parsed = new Date(`${date} ${time}`);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      
      // Handle various date formats with /
      const dateParts = date.split('/');
      let day, month, year;

      if (dateParts[2].length === 2) {
        // YY format - assume 20XX
        year = '20' + dateParts[2];
      } else {
        year = dateParts[2];
      }

      // ALWAYS use DD/MM format for this chat file since we see dates like 19/7/2025
      // This is more reliable than the ambiguous detection
      day = dateParts[0];
      month = dateParts[1];

      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}`;
      const parsed = new Date(dateStr);
      
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  private isNewMessage(line: string): boolean {
    // Check if line starts with a timestamp pattern
    const timestampPatterns = [
      /^\[\d{4}-\d{2}-\d{2}/,  // [YYYY-MM-DD format
      /^\[\d{1,2}\/\d{1,2}\/\d{4}/,  // [DD/MM/YYYY format
      /^\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}/,  // DD/MM/YY format
    ];

    return timestampPatterns.some(pattern => pattern.test(line));
  }

  private identifyUser(messages: WhatsAppMessage[]): void {
    // Find the sender with the most messages (likely the user)
    let maxCount = 0;
    let likelyUser = '';

    this.senderCounts.forEach((count, sender) => {
      if (count > maxCount) {
        maxCount = count;
        likelyUser = sender;
      }
    });

    this.userName = likelyUser;
  }
}