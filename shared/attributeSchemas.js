/**
 * Общий справочник атрибутов для подкатегорий.
 * Используется и на бэкенде, и на фронтенде.
 */
const ATTRIBUTE_SCHEMAS = {
  tulips_single: [
    { code: 'color', label: 'Цвет', type: 'select', options: ['красный', 'желтый', 'белый', 'микс'] },
    { code: 'stem_length_cm', label: 'Длина стебля (см)', type: 'number' },
    { code: 'price_per_piece', label: 'Цена за штуку', type: 'number' },
  ],
  tulip_bouquets: [
    { code: 'color', label: 'Цвет', type: 'select', options: ['красный', 'желтый', 'белый', 'микс'] },
    { code: 'stem_length_cm', label: 'Длина стебля (см)', type: 'number' },
    { code: 'quantity', label: 'Кол-во в букете', type: 'number' },
    { code: 'packing_type', label: 'Тип упаковки', type: 'select', options: ['классическая', 'крафт', 'коробка', 'корзина'] },
    { code: 'price_total', label: 'Цена за букет', type: 'number' },
  ],
  cakes: [
    { code: 'weight_kg', label: 'Вес торта (кг)', type: 'number' },
    { code: 'filling', label: 'Начинки', type: 'multiselect' },
    { code: 'decoration', label: 'Оформление', type: 'text' },
    { code: 'production_time_hours', label: 'Время изготовления (часы)', type: 'number' },
    { code: 'min_order_price', label: 'Мин. сумма заказа', type: 'number' },
  ],
  eclairs: [
    { code: 'quantity', label: 'Количество', type: 'number' },
    { code: 'filling', label: 'Начинки', type: 'multiselect' },
    { code: 'decoration', label: 'Оформление', type: 'text' },
    { code: 'production_time_hours', label: 'Время изготовления (часы)', type: 'number' },
    { code: 'min_order_quantity', label: 'Мин. партия заказа', type: 'number' },
  ],
  cupcakes: [
    { code: 'quantity', label: 'Количество', type: 'number' },
    { code: 'filling', label: 'Начинки', type: 'multiselect' },
    { code: 'decoration', label: 'Оформление', type: 'text' },
    { code: 'production_time_hours', label: 'Время изготовления (часы)', type: 'number' },
    { code: 'min_order_quantity', label: 'Мин. партия заказа', type: 'number' },
  ],
  sweets_sets: [
    { code: 'weight_kg', label: 'Вес набора (кг)', type: 'number' },
    { code: 'filling', label: 'Начинки', type: 'multiselect' },
    { code: 'packaging', label: 'Упаковка', type: 'text' },
    { code: 'production_time_hours', label: 'Время изготовления (часы)', type: 'number' },
    { code: 'min_order_price', label: 'Мин. сумма заказа', type: 'number' },
  ],
};

function getAttributeSchemaBySubcategory(subcategoryCode) {
  if (!subcategoryCode) return null;
  const normalized = String(subcategoryCode).trim().toLowerCase();
  return ATTRIBUTE_SCHEMAS[normalized] || null;
}

/**
 * Простейшая валидация: сверяет структуру и типы значений.
 * Возвращает { valid: boolean, errors: string[] }
 */
function validateAttributes(subcategoryCode, attributes) {
  const schema = getAttributeSchemaBySubcategory(subcategoryCode);
  if (!schema) {
    return { valid: true, errors: [] };
  }

  if (attributes == null || typeof attributes !== 'object') {
    return { valid: false, errors: ['Атрибуты должны быть объектом'] };
  }

  const errors = [];
  const normalized = { ...attributes };

  for (const field of schema) {
    const value = normalized[field.code];
    if (value === undefined || value === null || value === '') {
      continue; // опциональные поля
    }

    switch (field.type) {
      case 'number':
        if (!Number.isFinite(Number(value))) {
          errors.push(`Поле ${field.label} должно быть числом`);
        }
        break;
      case 'select':
        if (field.options && !field.options.includes(String(value))) {
          errors.push(`Поле ${field.label} должно быть одним из: ${field.options.join(', ')}`);
        }
        break;
      case 'multiselect':
        if (!Array.isArray(value)) {
          errors.push(`Поле ${field.label} должно быть массивом значений`);
        }
        break;
      case 'text':
        if (typeof value !== 'string') {
          errors.push(`Поле ${field.label} должно быть строкой`);
        }
        break;
      default:
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  ATTRIBUTE_SCHEMAS,
  getAttributeSchemaBySubcategory,
  validateAttributes,
};
