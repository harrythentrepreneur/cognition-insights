import crypto from 'crypto';

const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN!;
const PINTEREST_AD_ACCOUNT_ID = (process.env.PINTEREST_AD_ACCOUNT_ID || '');

// Helper to hash data for Enhanced Match (SHA256)
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

interface PinterestEvent {
  event_name: 'add_to_cart' | 'checkout' | 'page_visit' | 'search' | 'view_category' | 'lead' | 'signup' | 'watch_video' | 'custom';
  action_source: 'web' | 'app_android' | 'app_ios' | 'offline';
  event_time: number; // Unix timestamp in seconds
  event_id: string; // Unique ID for deduplication
  event_source_url?: string; // URL where conversion happened
  opt_out?: boolean;
  user_data: {
    em?: string[]; // Hashed emails (SHA256)
    ph?: string[]; // Hashed phone numbers (SHA256)
    ge?: string[]; // Hashed gender (SHA256)
    db?: string[]; // Hashed date of birth (SHA256)
    ln?: string[]; // Hashed last name (SHA256)
    fn?: string[]; // Hashed first name (SHA256)
    ct?: string[]; // Hashed city (SHA256)
    st?: string[]; // Hashed state (SHA256)
    zp?: string[]; // Hashed zip code (SHA256)
    country?: string[]; // Hashed country (SHA256)
    external_id?: string[]; // Hashed external ID (SHA256)
    client_ip_address?: string;
    client_user_agent?: string;
  };
  custom_data?: {
    currency?: string;
    value?: string; // String format per their example
    content_ids?: string[];
    content_name?: string;
    content_category?: string;
    content_brand?: string;
    contents?: Array<{
      quantity?: number;
      item_price?: string;
    }>;
    num_items?: number;
    order_id?: string;
    search_string?: string;
    order_quantity?: number;
  };
}

export async function sendPinterestEvent(
  eventName: PinterestEvent['event_name'],
  eventId: string,
  email?: string,
  customData?: PinterestEvent['custom_data'],
  userAgent?: string,
  ipAddress?: string,
  eventSourceUrl?: string,
  testMode: boolean = false
) {
  try {
    const event: PinterestEvent = {
      event_name: eventName,
      action_source: 'web',
      event_time: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
      event_id: eventId,
      event_source_url: eventSourceUrl,
      opt_out: false,
      user_data: {
        ...(email && { em: [hashValue(email)] }),
        ...(ipAddress && { client_ip_address: ipAddress }),
        ...(userAgent && { client_user_agent: userAgent }),
      },
      ...(customData && { custom_data: customData }),
    };

    // Build URL with optional test parameter
    const url = `https://api.pinterest.com/v5/ad_accounts/${PINTEREST_AD_ACCOUNT_ID}/events${testMode ? '?test=true' : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINTEREST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [event],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Pinterest API error:', error);
      return { success: false, error };
    }

    const result = await response.json();
    console.log(`Pinterest event sent successfully${testMode ? ' (TEST MODE)' : ''}:`, eventName, eventId);
    return { success: true, result };
  } catch (error) {
    console.error('Failed to send Pinterest event:', error);
    return { success: false, error };
  }
}

// Specific helper for checkout/purchase events
export async function sendPinterestPurchase(
  sessionId: string,
  email?: string,
  userAgent?: string,
  ipAddress?: string,
  eventSourceUrl?: string,
  testMode: boolean = false
) {
  // Use the same event ID format as client-side for deduplication
  const eventId = `checkout_stripe_${sessionId}`;
  
  return sendPinterestEvent(
    'checkout',
    eventId,
    email,
    {
      currency: 'USD',
      value: '79.00', // String format per Pinterest docs
      order_id: sessionId,
      order_quantity: 1,
      content_ids: ['cognition-lifetime'],
      content_name: 'Cognition Lifetime Access',
      content_category: 'Lifetime Access',
      num_items: 1,
    },
    userAgent,
    ipAddress,
    eventSourceUrl,
    testMode
  );
}