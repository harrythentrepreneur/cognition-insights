// API Response Types for Authentication Flow

export interface CreateUserAfterPaymentResponse {
  success: boolean;
  userId: string;
  signInTicket: string;
  message: string;
}

export interface SendWelcomeEmailResponse {
  success: boolean;
  message: string;
  emailId?: string;
  attempts?: number;
  resendDashboard?: string;
  magicLinkUrl?: string; // Only in development
}

export interface PreAuthCheckoutResponse {
  checkoutUrl: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  redirectUrl: string;
}

export interface CheckPaymentResponse {
  paid: boolean;
  sessionId?: string;
  customerEmail?: string;
}

export interface ErrorResponse {
  error: string;
  supportMessage?: string;
}

export interface CheckSubscriptionResponse {
  hasAccess: boolean;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  error?: string;
}

export interface SubscriptionConfirmResponse {
  success: boolean;
  message: string;
  subscriptionId?: string;
}