export interface AttributeField {
  code: string;
  label: string;
  type: 'select' | 'number' | 'multiselect' | 'text';
  options?: string[];
}

export const ATTRIBUTE_SCHEMAS: Record<string, AttributeField[]>;
export function getAttributeSchemaBySubcategory(subcategoryCode: string): AttributeField[] | null;
export function validateAttributes(
  subcategoryCode: string,
  attributes: Record<string, unknown>
): { valid: boolean; errors: string[] };
