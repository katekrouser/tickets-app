/**
 * Password hashing (A5) — Argon2id via @node-rs/argon2 (REQUIREMENTS §3).
 *
 * Plaintext passwords are NEVER stored or logged; only the Argon2id hash string
 * (self-describing: encodes algorithm, params and salt) is persisted.
 */
import { hash, verify, type Algorithm } from '@node-rs/argon2';

// @node-rs/argon2 exposes Algorithm.Argon2id === 2. It is declared as an ambient
// `const enum`, which cannot be referenced by value under `isolatedModules`, so we
// pin the numeric value directly. Argon2id is also the library default; pinning it
// makes the REQUIREMENTS §3 choice explicit and independent of future defaults.
const ARGON2ID = 2 as Algorithm;

/** Hash a plaintext password with Argon2id. Returns the encoded hash string. */
export function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, { algorithm: ARGON2ID });
}

/**
 * Verify a plaintext password against a stored Argon2id hash.
 * The algorithm/params are read from the hash string itself.
 */
export function verifyPassword(passwordHash: string, plaintext: string): Promise<boolean> {
  return verify(passwordHash, plaintext);
}
