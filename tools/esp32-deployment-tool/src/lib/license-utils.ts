/**
 * License token masking utility
 * 
 * Client-safe utility for masking license tokens for display
 */

/**
 * Mask license token for display (show first and last 4 characters)
 * @param token - Full license token
 * @returns Masked token string
 */
export function maskLicenseToken(token: string): string {
  if (!token || token.length <= 8) {
    return '****';
  }
  
  const first4 = token.substring(0, 4);
  const last4 = token.substring(token.length - 4);
  const middleLength = Math.min(token.length - 8, 32);
  const middle = '*'.repeat(middleLength);
  
  return `${first4}${middle}${last4}`;
}
