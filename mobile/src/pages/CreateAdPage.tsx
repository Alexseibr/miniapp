import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adsApi } from '../api/adsApi';

export default function CreateAdPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adsApi.createAd({
        title,
        description,
        price: Number(price),
        categoryId,
        cityCode,
        photos: [],
        locationHint: ''
      });
      navigate('/my-ads');
    } catch (err) {
      setError('Не удалось создать объявление');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Новое объявление</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full border rounded-lg px-3 py-3"
          placeholder="Категория"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-lg px-3 py-3"
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="w-full border rounded-lg px-3 py-3"
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-lg px-3 py-3"
          placeholder="Цена"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-lg px-3 py-3"
          placeholder="Город"
          value={cityCode}
          onChange={(e) => setCityCode(e.target.value)}
          required
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          className="w-full bg-primary text-white rounded-lg py-3 font-semibold disabled:opacity-60"
          disabled={saving}
        >
          {saving ? 'Публикуем...' : 'Создать'}
        </button>
      </form>
    </div>
  );
}
