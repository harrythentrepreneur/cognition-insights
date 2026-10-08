declare namespace NodeJS {
  interface ProcessEnv {
    // Clerk
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    
    // Stripe
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    
    // Google Service Account
    GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
    GOOGLE_SERVICE_ACCOUNT_KEY: string;
    
    // Firebase (optional)
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_CLIENT_EMAIL?: string;
    FIREBASE_PRIVATE_KEY?: string;
    
    // Backend API (temporary)
    NEXT_PUBLIC_API_BASE_URL?: string;
    
    // Pinterest API
    PINTEREST_ACCESS_TOKEN?: string;
    
    // Reddit API
    REDDIT_ACCESS_TOKEN?: string;
    
    // Facebook API
    FACEBOOK_ACCESS_TOKEN?: string;
    FACEBOOK_TEST_EVENT_CODE?: string;
  }
}