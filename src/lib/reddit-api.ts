import crypto from 'crypto';

const REDDIT_PIXEL_ID = (process.env.REDDIT_PIXEL_ID || '');
const REDDIT_ACCESS_TOKEN = process.env.REDDIT_ACCESS_TOKEN!;

// Helper to hash values with SHA256
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

interface RedditUser {
  ip_address?: string;
  user_agent?: string;
  screen_dimensions?: {
    width: number;
    height: number;
  };
  email?: string;
  phone_number?: string;
  external_id?: string;
  idfa?: string;
  aaid?: string;
  uuid?: string;
}

interface RedditEventMetadata {
  item_count?: number;
  currency?: string;
  value_decimal?: number;
  conversion_id?: string; // Required for deduplication
  products?: Array<{
    id?: string;
    name?: string;
    category?: string;
  }>;
}

interface RedditEvent {
  event_at: string; // ISO 8601 format
  event_type: {
    tracking_type: 'PageVisit' | 'ViewContent' | 'Search' | 'AddToCart' | 'AddToWishlist' | 'Purchase' | 'Lead' | 'SignUp' | 'Custom';
    custom_event_name?: string;
  };
  click_id?: string;
  user?: RedditUser;
  event_metadata?: RedditEventMetadata;
}

export async function sendRedditEvent(
  trackingType: RedditEvent['event_type']['tracking_type'],
  conversionId: string,
  email?: string,
  eventMetadata?: RedditEventMetadata,
  userAgent?: string,
  ipAddress?: string,
  testMode: boolean = false
) {
  try {
    const now = new Date().toISOString();
    
    const event: RedditEvent = {
      event_at: now,
      event_type: {
        tracking_type: trackingType,
      },
      user: {
        ...(email && { email: hashValue(email) }), // Hash email for privacy
        ...(ipAddress && { ip_address: ipAddress }),
        ...(userAgent && { user_agent: userAgent }),
      },
      event_metadata: {
        conversion_id: conversionId, // Required for deduplication
        ...eventMetadata,
      },
    };

    const response = await fetch(
      `https://ads-api.reddit.com/api/v2.0/conversions/events/${REDDIT_PIXEL_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REDDIT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_mode: testMode,
          events: [event],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Reddit API error:', error);
      return { success: false, error };
    }

    const result = await response.json();
    console.log(`Reddit event sent successfully${testMode ? ' (TEST MODE)' : ''}:`, trackingType, conversionId);
    return { success: true, result };
  } catch (error) {
    console.error('Failed to send Reddit event:', error);
    return { success: false, error };
  }
}

// Specific helper for purchase events
export async function sendRedditPurchase(
  sessionId: string,
  email?: string,
  userAgent?: string,
  ipAddress?: string,
  testMode: boolean = false
) {
  // Use the same conversion ID format as client-side for deduplication
  const conversionId = `purchase_stripe_${sessionId}`;
  
  return sendRedditEvent(
    'Purchase',
    conversionId,
    email,
    {
      item_count: 1,
      currency: 'USD',
      value_decimal: 79.00,
      products: [{
        id: 'cognition-lifetime',
        name: 'Cognition Lifetime Access',
        category: 'Lifetime Access',
      }],
    },
    userAgent,
    ipAddress,
    testMode
  );
}

// Helper for add to cart events
export async function sendRedditAddToCart(
  timestamp: string,
  email?: string,
  userAgent?: string,
  ipAddress?: string,
  testMode: boolean = false
) {
  // Use the same conversion ID format as client-side for deduplication
  const conversionId = `addtocart_${timestamp}`;
  
  return sendRedditEvent(
    'AddToCart',
    conversionId,
    email,
    {
      item_count: 1,
      currency: 'USD',
      value_decimal: 79.00,
      products: [{
        id: 'cognition-lifetime',
        name: 'Cognition Lifetime Access',
        category: 'Lifetime Access',
      }],
    },
    userAgent,
    ipAddress,
    testMode
  );
}