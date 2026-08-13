import argon2 from 'argon2';
import crypto from 'node:crypto';

// argon2id per master.md §6
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

// Node.js native crypto scrypt fallback for serverless environments (e.g. Vercel)
function scryptHash(plain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(plain, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function scryptVerify(hash: string, plain: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = hash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return resolve(false);
    const salt = parts[1];
    const key = parts[2];
    crypto.scrypt(plain, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        if (keyBuffer.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

export const hashPassword = async (plain: string): Promise<string> => {
  try {
    return await argon2.hash(plain, OPTIONS);
  } catch (err) {
    console.warn('[passwords] argon2 failed, using native crypto fallback:', err);
    return scryptHash(plain);
  }
};

export const verifyPassword = async (hash: string, plain: string): Promise<boolean> => {
  if (!hash) return false;
  try {
    if (hash.startsWith('scrypt:')) {
      return await scryptVerify(hash, plain);
    }
    return await argon2.verify(hash, plain);
  } catch (err) {
    console.warn('[passwords] argon2 verify failed, trying fallback:', err);
    if (hash.startsWith('scrypt:')) {
      return scryptVerify(hash, plain);
    }
    return false;
  }
};
