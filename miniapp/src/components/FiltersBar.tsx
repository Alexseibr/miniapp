interface Props {
  sort: 'newest' | 'price_asc' | 'price_desc';
  deliveryOnly: boolean;
  onSortChange: (value: Props['sort']) => void;
  onDeliveryChange: (value: boolean) => void;
}

export default function FiltersBar({ sort, deliveryOnly, onSortChange, onDeliveryChange }: Props) {
  return (
    <div className="card" style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Фильтры</h3>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        Сортировка
        <select value={sort} onChange={(e) => onSortChange(e.target.value as Props['sort'])}>
          <option value="newest">Сначала новые</option>
          <option value="price_asc">Сначала дешёвые</option>
          <option value="price_desc">Сначала дорогие</option>
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={deliveryOnly} onChange={(e) => onDeliveryChange(e.target.checked)} />
        Только с доставкой
      </label>
    </div>
  );
}
