export type PasswordOptions = {
  length: number; count: number; lowercase: boolean; uppercase: boolean;
  numbers: boolean; symbols: boolean; excludeAmbiguous: boolean;
};
const GROUPS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz', uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
};

function alphabets(options: PasswordOptions): string[] {
  return (Object.keys(GROUPS) as Array<keyof typeof GROUPS>)
    .filter(key => options[key]).map(key => options.excludeAmbiguous ? GROUPS[key].replace(/[Il1O0o]/g, '') : GROUPS[key]);
}

export function passwordDetails(options: PasswordOptions): { alphabetSize: number; entropyBits: number } {
  const groups = alphabets(options);
  const total = groups.join('').length;
  if (!total || options.length < groups.length || !Number.isInteger(options.length) || options.length > 128) return { alphabetSize: total, entropyBits: 0 };
  // Inclusion–exclusion counts only strings that contain every selected character group.
  let probability = 0;
  for (let mask = 0; mask < (1 << groups.length); mask++) {
    let removed = 0, parity = 0;
    groups.forEach((group, index) => { if (mask & (1 << index)) { removed += group.length; parity++; } });
    probability += (parity % 2 ? -1 : 1) * Math.pow((total - removed) / total, options.length);
  }
  return { alphabetSize: total, entropyBits: Math.max(0, options.length * Math.log2(total) + Math.log2(Math.max(Number.EPSILON, probability))) };
}

export function generatePasswords(options: PasswordOptions): string[] {
  const groups = alphabets(options), alphabet = groups.join('');
  if (!groups.length) throw new Error('Select at least one character group.');
  if (!Number.isInteger(options.length) || options.length < Math.max(4, groups.length) || options.length > 128) throw new Error('Choose a password length from 4 to 128.');
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 100) throw new Error('Generate between 1 and 100 passwords at a time.');
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure randomness is unavailable in this browser.');
  let pool = new Uint8Array(256), position = pool.length;
  const ceiling = 256 - (256 % alphabet.length);
  const character = () => {
    let value: number;
    do {
      if (position === pool.length) { pool = crypto.getRandomValues(new Uint8Array(256)); position = 0; }
      value = pool[position++];
    } while (value >= ceiling);
    return alphabet[value % alphabet.length];
  };
  return Array.from({ length: options.count }, () => {
    // Reject whole candidates to sample uniformly from passwords meeting all requirements.
    for (let attempt = 0; attempt < 4096; attempt++) {
      const candidate = Array.from({ length: options.length }, character).join('');
      if (groups.every(group => Array.from(candidate).some(char => group.includes(char)))) return candidate;
    }
    throw new Error('Could not generate a password with these requirements. Try again.');
  });
}
