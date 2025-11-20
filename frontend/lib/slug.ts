export const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const parseIdFromParam = (idSlug: string | string[] | undefined): string | null => {
  if (!idSlug) return null;
  const value = Array.isArray(idSlug) ? idSlug[0] : idSlug;
  return value?.split('-')[0] || null;
};
