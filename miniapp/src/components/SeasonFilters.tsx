interface Props {
  filters: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

const colors = ['mix', 'white', 'yellow', 'red', 'violet'];
const types = ['bouquet', 'single', 'gift'];

export default function SeasonFilters({ filters, onChange }: Props) {
  const setFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Фильтры ярмарки</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={filters.color === color ? 'primary' : 'secondary'}
            style={{ flex: '1 1 140px' }}
            onClick={() => setFilter('color', color)}
          >
            Цвет: {color}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {types.map((type) => (
          <button
            key={type}
            type="button"
            className={filters.type === type ? 'primary' : 'secondary'}
            style={{ flex: '1 1 140px' }}
            onClick={() => setFilter('type', type)}
          >
            Тип: {type}
          </button>
        ))}
      </div>
    </section>
  );
}
