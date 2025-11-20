import { validateTulipAttributes } from '../../shared/validation/tulip'; // скорректируйте путь

describe('validateTulipAttributes', () => {
  it('accepts valid attributes', () => {
    const input = { color: 'red', stemLengthCm: 30, count: 10 };
    const res = validateTulipAttributes(input);
    expect(res.valid).toBe(true);
    expect(res.errors).toBeUndefined();
  });

  it('rejects missing required fields', () => {
    const input = { stemLengthCm: 30 };
    const res = validateTulipAttributes(input);
    expect(res.valid).toBe(false);
    expect(Array.isArray(res.errors)).toBe(true);
    expect(res.errors.some((e: string) => /color/i.test(e))).toBe(true);
  });

  it('rejects invalid types', () => {
    const input = { color: 123, stemLengthCm: 'long', count: -5 };
    const res = validateTulipAttributes(input);
    expect(res.valid).toBe(false);
  });
});
