import { describe, expect, it } from 'vitest';
import {
  INSTITUTION_DOMAIN_ERROR,
  institutionDomainInputSchema,
  normalizeDomain,
} from '@/shared/validation/domain';

describe('domain validation', () => {
  it.each([
    ['example.com', 'example.com'],
    ['www.example.com', 'example.com'],
    ['https://www.example.com/cards', 'example.com'],
  ])('normalizes %s', (value, expected) => {
    expect(normalizeDomain(value)).toBe(expected);
    expect(institutionDomainInputSchema.safeParse(value).success).toBe(true);
  });

  it.each(['not-a-domain', 'example', 'https://', 'example .com'])(
    'rejects %s with a useful message',
    (value) => {
      const result = institutionDomainInputSchema.safeParse(value);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.issues[0]?.message).toBe(INSTITUTION_DOMAIN_ERROR);
    },
  );
});
