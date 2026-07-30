import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique canteen order token number.
 * Format: TK-XXXX where XXXX is a zero-padded sequential number.
 * For Phase 1 we use a timestamp-based approach; in Phase 6
 * this will be replaced with a DB sequence counter.
 *
 * Example output: TK-2041, TK-7823
 */
export function generateTokenNumber(): string {
  // Use last 4 digits of current timestamp for uniqueness
  const suffix = String(Date.now()).slice(-4);
  return `TK-${suffix}`;
}

/**
 * Generates a UUID v4 string — used for CHAR(36) primary keys.
 */
export function generateUUID(): string {
  return uuidv4();
}
