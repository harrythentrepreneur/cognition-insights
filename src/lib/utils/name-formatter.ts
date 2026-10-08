/**
 * Formats a name string to have proper capitalization
 * - First letter uppercase
 * - Rest of the letters lowercase
 * - Handles multiple words (first name only)
 * - Cleans up payment processor formatting
 */
export function formatFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'User';
  
  // Clean up common payment processor formatting
  const cleaned = fullName
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s'-]/g, '') // Remove special chars except apostrophes and hyphens
    .split(' ')[0]; // Get first name only
  
  if (!cleaned) return 'User';
  
  // Capitalize first letter, lowercase the rest
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

/**
 * Extracts and formats the first name from Stripe customer details
 */
export function extractStripeFirstName(customerName: string | null | undefined): string {
  return formatFirstName(customerName);
}