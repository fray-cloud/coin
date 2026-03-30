import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto';

// 64-char hex = 32 bytes = AES-256
const TEST_KEY = 'a'.repeat(64);
const ANOTHER_KEY = 'b'.repeat(64);

describe('encrypt/decrypt', () => {
  it('should encrypt and decrypt a string (round trip)', () => {
    const plaintext = 'my-secret-api-key';
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for the same plaintext (random IV)', () => {
    const plaintext = 'same-text';
    const a = encrypt(plaintext, TEST_KEY);
    const b = encrypt(plaintext, TEST_KEY);
    expect(a).not.toBe(b);
  });

  it('should fail decryption with a wrong key', () => {
    const encrypted = encrypt('secret', TEST_KEY);
    expect(() => decrypt(encrypted, ANOTHER_KEY)).toThrow();
  });

  it('should handle unicode strings', () => {
    const plaintext = '한글 테스트 🚀';
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw on invalid encrypted format', () => {
    expect(() => decrypt('invalid-format', TEST_KEY)).toThrow('Invalid encrypted format');
  });
});
