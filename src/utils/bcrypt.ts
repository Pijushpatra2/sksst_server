import bcrypt from 'bcryptjs';

/**
 * Hashing and comparing helper using bcryptjs.
 */

/**
 * Hashes a plaintext password.
 * Default salt rounds: 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
