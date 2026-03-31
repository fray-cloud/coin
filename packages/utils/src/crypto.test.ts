import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto';

// 64-char hex = 32 bytes = AES-256
const TEST_KEY = 'a'.repeat(64);
const ANOTHER_KEY = 'b'.repeat(64);

describe('encrypt/decrypt', () => {
  it('문자열 암호화 후 복호화하면 원본과 동일해야 한다', () => {
    const plaintext = 'my-secret-api-key';
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('동일한 평문이라도 매번 다른 암호문을 생성해야 한다 (랜덤 IV)', () => {
    const plaintext = 'same-text';
    const a = encrypt(plaintext, TEST_KEY);
    const b = encrypt(plaintext, TEST_KEY);
    expect(a).not.toBe(b);
  });

  it('잘못된 키로 복호화하면 실패해야 한다', () => {
    const encrypted = encrypt('secret', TEST_KEY);
    expect(() => decrypt(encrypted, ANOTHER_KEY)).toThrow();
  });

  it('유니코드 문자열을 처리할 수 있어야 한다', () => {
    const plaintext = '한글 테스트 🚀';
    const encrypted = encrypt(plaintext, TEST_KEY);
    const decrypted = decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('잘못된 암호문 형식이면 에러를 던져야 한다', () => {
    expect(() => decrypt('invalid-format', TEST_KEY)).toThrow('Invalid encrypted format');
  });
});
