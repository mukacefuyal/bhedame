const ANON_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function anonymousCode(seed: string) {
  const source = seed || "guest";
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let code = "";
  let value = hash;
  for (let i = 0; i < 4; i++) {
    code += ANON_ALPHABET[value % ANON_ALPHABET.length];
    value = Math.imul(value ^ (value >>> 13), 2246822519) >>> 0;
  }
  return code;
}

export function anonymousDisplayName(seed: string) {
  return `Anonymous ${anonymousCode(seed)}`;
}
