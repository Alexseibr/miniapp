import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.post('/resolve', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Требуются корректные координаты lat и lng' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: 'Координаты вне допустимого диапазона' });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lngNum}&accept-language=ru&addressdetails=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'KETMAR-Market/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API вернул статус ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return res.status(404).json({
        error: 'Не удалось определить местоположение',
        label: 'Неизвестное место',
      });
    }

    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.hamlet || null;
    const suburb = addr.suburb || addr.neighbourhood || addr.quarter || null;
    const village = addr.village || addr.hamlet || null;
    const district = addr.city_district || null;

    let label = '';
    let area = null;

    if (village && !city) {
      label = `д. ${village}`;
    } else if (city && suburb) {
      area = suburb;
      label = `${city} (${suburb})`;
    } else if (city && district) {
      area = district;
      label = `${city} (${district})`;
    } else if (city) {
      label = city;
    } else if (village) {
      label = `д. ${village}`;
    } else {
      label = addr.state || addr.country || 'Неизвестное место';
    }

    const result = {
      lat: latNum,
      lng: lngNum,
      city: city || village || null,
      area,
      village: village && !city ? village : null,
      label,
      raw: {
        display_name: data.display_name,
        address: addr,
      },
    };

    res.json(result);
  } catch (error) {
    console.error('Ошибка геокодинга:', error);
    res.status(500).json({
      error: 'Ошибка сервера при определении местоположения',
      label: 'Неизвестное место',
    });
  }
});

router.get('/preset-locations', (req, res) => {
  const presetLocations = [
    { city: 'Минск', label: 'Минск', lat: 53.9045, lng: 27.5615 },
    { city: 'Брест', label: 'Брест', lat: 52.0975, lng: 23.7340 },
    { city: 'Гомель', label: 'Гомель', lat: 52.4345, lng: 30.9754 },
    { city: 'Витебск', label: 'Витебск', lat: 55.1904, lng: 30.2049 },
    { city: 'Гродно', label: 'Гродно', lat: 53.6693, lng: 23.8131 },
    { city: 'Могилёв', label: 'Могилёв', lat: 53.9007, lng: 30.3313 },
  ];

  res.json({ items: presetLocations });
});

export default router;
