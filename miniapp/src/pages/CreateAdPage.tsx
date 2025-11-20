import { FormEvent, useState } from 'react';
import { createAd } from '../api/ads';
import api from '../api/axios';

const CreateAdPage = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [seasonCode, setSeasonCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [message, setMessage] = useState('');

  const uploadPhoto = async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post('/uploads/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url as string;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description,
        price: Number(price),
        category,
        subcategory,
        seasonCode,
        photos: photoUrl ? [photoUrl] : [],
        lat: Number(lat),
        lng: Number(lng),
      };
      await createAd(payload);
      setMessage('Объявление создано');
    } catch (err) {
      setMessage('Ошибка при создании');
      console.error(err);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h3>Создание объявления</h3>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <input placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Цена"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          required
        />
        <input placeholder="Категория" value={category} onChange={(e) => setCategory(e.target.value)} required />
        <input placeholder="Подкатегория" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} />
        <input placeholder="Код сезона" value={seasonCode} onChange={(e) => setSeasonCode(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            step="any"
            placeholder="Широта"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            required
          />
          <input
            type="number"
            step="any"
            placeholder="Долгота"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            required
          />
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            if (e.target.files?.[0]) {
              const url = await uploadPhoto(e.target.files[0]);
              setPhotoUrl(url);
            }
          }}
        />
        {photoUrl && <img src={photoUrl} alt="preview" style={{ maxWidth: '100%', borderRadius: 8 }} />}
        <button className="button" type="submit">
          Создать
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default CreateAdPage;
