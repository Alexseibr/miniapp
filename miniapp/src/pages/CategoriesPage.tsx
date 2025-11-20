import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories } from '@/api/categories';
import { CategoryNode } from '@/types';

interface CategoryItem extends CategoryNode {
  parentSlug?: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data as CategoryItem[]);
    } catch (err) {
      setError('Не удалось загрузить категории. Попробуйте обновить страницу.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const renderSubcategories = (list: CategoryItem[] = [], parentSlug: string | null, depth = 0) => (
    <ul className="tree" style={{ paddingLeft: depth * 16 }}>
      {list.map((subcategory) => (
        <li key={subcategory.slug} className="tree__item">
          <div className="tree__row">
            <div>
              <p className="tree__title">
                {subcategory.name} <span className="muted">({subcategory.slug})</span>
              </p>
            </div>
            <Link
              to={`/ads?category=${encodeURIComponent(parentSlug || subcategory.parentSlug || '')}&subcategory=${encodeURIComponent(subcategory.slug)}`}
              className="link"
            >
              Смотреть объявления →
            </Link>
          </div>
          {subcategory.subcategories && subcategory.subcategories.length > 0 &&
            renderSubcategories(subcategory.subcategories as CategoryItem[], subcategory.slug, depth + 1)}
        </li>
      ))}
    </ul>
  );

  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parentSlug || category.parentSlug === 'null'),
    [categories],
  );

  return (
    <div className="page-grid">
      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Категории</p>
            <h2 className="card__title">Дерево категорий</h2>
            <p className="muted">Нажмите на подкатегорию, чтобы перейти к объявлениям.</p>
          </div>
          <button type="button" className="secondary" onClick={loadCategories} disabled={loading}>
            {loading ? 'Обновляем…' : 'Обновить'}
          </button>
        </div>

        {loading && <p className="muted">Загружаем дерево категорий…</p>}
        {error && <div className="error-box"><p className="error-box__body">{error}</p></div>}

        {!loading && !error && rootCategories.length === 0 && <p className="muted">Категорий пока нет.</p>}

        {!loading && !error && rootCategories.length > 0 && (
          <div className="grid categories-grid">
            {rootCategories.map((category) => (
              <article key={category.slug} className="card card--sub">
                <div className="card__header card__header--compact">
                  <div>
                    <p className="eyebrow">{category.slug}</p>
                    <h3 className="card__title">{category.name}</h3>
                  </div>
                  <span className="badge">{category.subcategories?.length || 0} подкатегорий</span>
                </div>
                {category.subcategories?.length ? (
                  renderSubcategories(category.subcategories as CategoryItem[], category.slug, 1)
                ) : (
                  <p className="muted">Подкатегории не указаны.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
