import argon2 from 'argon2';

// argon2id per master.md §6
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB (OWASP recommended minimum)
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string) => argon2.hash(plain, OPTIONS);

export const verifyPassword = async (hash: string, plain: string) => {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
};
