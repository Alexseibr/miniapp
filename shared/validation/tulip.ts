export interface TulipAttributes {
  color?: string;
  stemLengthCm?: number;
  count?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const validateTulipAttributes = (
  attrs: Partial<TulipAttributes> | null | undefined,
): ValidationResult => {
  const errors: string[] = [];

  if (!attrs || typeof attrs !== 'object') {
    return {
      valid: false,
      errors: ['Attributes object is required.'],
    };
  }

  const { color, stemLengthCm, count } = attrs;

  if (typeof color !== 'string' || color.trim().length === 0) {
    errors.push('Color is required and must be a non-empty string.');
  }

  if (!isFiniteNumber(stemLengthCm)) {
    errors.push('Stem length (cm) is required and must be a positive number.');
  } else if (stemLengthCm <= 0) {
    errors.push('Stem length (cm) must be greater than 0.');
  }

  if (!isFiniteNumber(count)) {
    errors.push('Count is required and must be a positive integer.');
  } else if (!Number.isInteger(count) || count <= 0) {
    errors.push('Count must be a positive integer.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
};
