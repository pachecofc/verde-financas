import crypto from 'crypto';

const ENCRYPTION_PREFIX = 'enc:';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ALGORITHM = 'aes-256-gcm';

/**
 * Deriva chave por usuário a partir da chave mestra (HKDF).
 * Cada usuário tem uma chave distinta; vazamento de uma não expõe as outras.
 */
function deriveUserKey(userId: string): Buffer {
  const masterKey = getMasterKey();
  const out = crypto.hkdfSync(
    'sha256',
    masterKey,
    Buffer.from(userId, 'utf8'),
    Buffer.from('user-encryption', 'utf8'),
    KEY_LENGTH
  );
  return Buffer.from(new Uint8Array(out as ArrayBuffer));
}

function getMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw || raw.length < 32) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY deve estar definida no .env com pelo menos 32 caracteres (base64 ou hex).'
    );
  }
  if (/^[A-Za-z0-9+/]+=*$/.test(raw)) {
    try {
      const buf = Buffer.from(raw, 'base64');
      if (buf.length >= KEY_LENGTH) return buf.subarray(0, KEY_LENGTH);
    } catch {
      // fallback
    }
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return Buffer.from(raw, 'utf8').subarray(0, KEY_LENGTH);
}

/**
 * Criptografa texto com chave derivada do userId.
 * Retorna string no formato "enc:" + base64(iv + ciphertext + authTag).
 * Valores null/undefined/'' são retornados como estão.
 */
export function encrypt(userId: string, plaintext: string | null | undefined): string | null | undefined {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext;
  }
  const key = deriveUserKey(userId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return ENCRYPTION_PREFIX + combined.toString('base64');
}

/**
 * Descriptografa valor armazenado.
 * Se o valor não começar com "enc:", retorna como está (compatibilidade com texto claro).
 */
export function decrypt(userId: string, ciphertext: string | null | undefined): string | null | undefined {
  if (ciphertext === null || ciphertext === undefined || ciphertext === '') {
    return ciphertext;
  }
  if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    return ciphertext;
  }
  try {
    const raw = Buffer.from(ciphertext.slice(ENCRYPTION_PREFIX.length), 'base64');
    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return ciphertext;
    }
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(raw.length - AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH, raw.length - AUTH_TAG_LENGTH);
    const key = deriveUserKey(userId);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return ciphertext;
  }
}

export const EncryptionService = { encrypt, decrypt };
