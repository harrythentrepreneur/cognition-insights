declare global {
  interface Window {
    // Triple Whale Pixel
    TriplePixel?: (
      event: string,
      data?: {
        item?: string;
        q?: number;
        v?: string | number;
        email?: string;
        [key: string]: any;
      }
    ) => void;
    
    // Facebook Pixel
    fbq?: (
      track: string,
      event: string,
      data?: any,
      options?: { eventID?: string }
    ) => void;
    
    // Google Analytics
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    
    // Pinterest Tag
    pintrk?: (
      command: string,
      event: string,
      data?: {
        event_id?: string;
        value?: number;
        order_quantity?: number;
        currency?: string;
        order_id?: string;
        em?: string;
        [key: string]: any;
      }
    ) => void;
    
    // Reddit Pixel
    rdt?: (
      command: 'init' | 'track',
      eventOrPixelId: string,
      data?: {
        conversion_id?: string;
        currency?: string;
        value?: number;
        itemCount?: number;
        transactionId?: string;
        products?: Array<{
          id?: string;
          name?: string;
          category?: string;
        }>;
        email?: string;
        phoneNumber?: string;
        externalId?: string;
        idfa?: string;
        aaid?: string;
      }
    ) => void;
    
    // Snapchat Pixel
    snaptr?: (
      command: 'init' | 'track',
      eventOrPixelId: string,
      data?: {
        price?: number;
        currency?: string;
        transaction_id?: string;
        item_ids?: string[];
        item_category?: string;
        number_items?: number;
        payment_info_available?: 0 | 1;
        user_email?: string;
        user_hashed_email?: string;
        user_hashed_phone_number?: string;
        firstname?: string;
        uuid_c1?: string;
      }
    ) => void;
  }
}

export {};