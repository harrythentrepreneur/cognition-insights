import crypto from 'crypto';

const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || '';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN!;
const FACEBOOK_API_VERSION = 'v18.0';

// Helper to hash data with SHA256 (required by Facebook)
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

interface FacebookUserData {
  em?: string;          // Email (hashed)
  ph?: string;          // Phone (hashed)
  fn?: string;          // First name (hashed)
  ln?: string;          // Last name (hashed)
  ct?: string;          // City (hashed)
  st?: string;          // State/Province (hashed)
  zp?: string;          // Zip/Postal code (hashed)
  country?: string;     // Country code (hashed)
  external_id?: string; // External ID (hashed)
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;         // Facebook click ID from _fbc cookie
  fbp?: string;         // Facebook browser ID from _fbp cookie
}

interface FacebookServerEvent {
  event_name: 'PageView' | 'ViewContent' | 'Search' | 'AddToCart' | 'AddToWishlist' | 
              'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase' | 'Lead' | 'CompleteRegistration';
  event_time: number;   // Unix timestamp in seconds
  event_id?: string;    // For deduplication with Pixel
  event_source_url: string;
  action_source: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  user_data: FacebookUserData;
  custom_data?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    contents?: Array<{
      id: string;
      quantity?: number;
      item_price?: number;
    }>;
    content_type?: string;
    order_id?: string;
    predicted_ltv?: number;
    num_items?: number;
    status?: string;
    search_string?: string;
  };
  data_processing_options?: string[];
  data_processing_options_country?: number;
  data_processing_options_state?: number;
}

export async function sendFacebookEvent(
  eventName: FacebookServerEvent['event_name'],
  eventId: string,
  eventSourceUrl: string,
  userData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    ipAddress?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
  },
  customData?: FacebookServerEvent['custom_data'],
  testEventCode?: string // For testing in Events Manager
) {
  try {
    // Prepare user data with proper hashing
    const hashedUserData: FacebookUserData = {
      ...(userData.email && { em: hashValue(userData.email) }),
      ...(userData.firstName && { fn: hashValue(userData.firstName) }),
      ...(userData.lastName && { ln: hashValue(userData.lastName) }),
      ...(userData.ipAddress && { client_ip_address: userData.ipAddress }),
      ...(userData.userAgent && { client_user_agent: userData.userAgent }),
      ...(userData.fbc && { fbc: userData.fbc }),
      ...(userData.fbp && { fbp: userData.fbp }),
    };

    const event: FacebookServerEvent = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId, // Critical for deduplication
      event_source_url: eventSourceUrl,
      action_source: 'website',
      user_data: hashedUserData,
      ...(customData && { custom_data: customData }),
    };

    const requestBody: any = {
      data: [event],
      ...(testEventCode && { test_event_code: testEventCode }),
    };

    const response = await fetch(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestBody,
          access_token: FACEBOOK_ACCESS_TOKEN,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Facebook Conversions API error:', error);
      return { success: false, error };
    }

    const result = await response.json();
    console.log(`Facebook event sent successfully${testEventCode ? ' (TEST MODE)' : ''}:`, eventName, eventId);
    return { success: true, result };
  } catch (error) {
    console.error('Failed to send Facebook event:', error);
    return { success: false, error };
  }
}

// Helper for InitiateCheckout events
export async function sendFacebookInitiateCheckout(
  eventId: string,
  eventSourceUrl: string,
  userData: {
    email?: string;
    firstName?: string;
    ipAddress?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
  },
  testEventCode?: string
) {
  return sendFacebookEvent(
    'InitiateCheckout',
    eventId,
    eventSourceUrl,
    userData,
    {
      value: 79.00,
      currency: 'USD',
      content_name: 'Cognition Lifetime Access',
      content_category: 'Lifetime Access',
      content_ids: ['cognition-lifetime'],
      content_type: 'product',
      num_items: 1,
    },
    testEventCode
  );
}

// Helper for Purchase events
export async function sendFacebookPurchase(
  sessionId: string,
  eventSourceUrl: string,
  userData: {
    email?: string;
    firstName?: string;
    ipAddress?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
  },
  testEventCode?: string
) {
  // Use the same event ID format as client-side for deduplication
  const eventId = `purchase_${sessionId}`;
  
  return sendFacebookEvent(
    'Purchase',
    eventId,
    eventSourceUrl,
    userData,
    {
      value: 79.00,
      currency: 'USD',
      content_name: 'Cognition Lifetime Access',
      content_category: 'Lifetime Access',
      content_ids: ['cognition-lifetime'],
      content_type: 'product',
      order_id: sessionId,
      num_items: 1,
    },
    testEventCode
  );
}

// Helper for ViewContent events  
export async function sendFacebookViewContent(
  contentName: string,
  contentCategory: string,
  eventSourceUrl: string,
  userData: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
  },
  testEventCode?: string
) {
  const timestamp = Date.now();
  const eventId = `view_content_${timestamp}`;
  
  return sendFacebookEvent(
    'ViewContent',
    eventId,
    eventSourceUrl,
    userData,
    {
      content_name: contentName,
      content_category: contentCategory,
      content_type: 'product',
    },
    testEventCode
  );
}