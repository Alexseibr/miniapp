import { useEffect, useState } from 'react';
import { MapPin, Loader2, Check, LocateFixed } from 'lucide-react';
import { resolveGeoLocation } from '@/api/geo';
import { usePlatform } from '@/platform/PlatformProvider';
import { Button } from '@/components/ui/button';

interface BaseLocationPromptProps {
  open: boolean;
  onSubmit: (data: { lat: number; lng: number; address?: string }) => Promise<void>;
}

export function BaseLocationPrompt({ open, onSubmit }: BaseLocationPromptProps) {
  const { requestLocation } = usePlatform();
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [detectedLabel, setDetectedLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
  }, [open]);

  const handleDetect = async () => {
    setLoading(true);
    setError('');
    try {
      const coords = await requestLocation();
      setLat(coords.lat);
      setLng(coords.lng);
      const resolved = await resolveGeoLocation(coords.lat, coords.lng);
      setDetectedLabel(resolved.label || 'Определенная точка');
      if (resolved.raw?.display_name) {
        setAddress(resolved.raw.display_name);
      }
    } catch (err) {
      console.error('Detect base location error', err);
      setError('Не удалось определить точку. Введите адрес вручную.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (lat == null || lng == null) {
      setError('Укажите точку на карте или определите автоматически');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ lat, lng, address: address.trim() || detectedLabel || undefined });
    } catch (err) {
      setError('Не удалось сохранить точку. Попробуйте еще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Вы с этой точки будете продавать товар?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Выберите базовую локацию один раз. Мы будем подставлять ее при создании новых товаров.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-600" />
            <span>Локация нужна только один раз для кабинета продавца</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <LocateFixed className="w-4 h-4 text-primary" />
            <span>Все новые товары получат эту точку автоматически</span>
          </div>
        </div>

        <div className="space-y-2 p-4 rounded-xl bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Координаты</p>
              <p className="text-xs text-muted-foreground">
                {lat != null && lng != null
                  ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                  : 'Точка ещё не выбрана'}
              </p>
            </div>
            <Button onClick={handleDetect} disabled={loading} variant="secondary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 mr-1" />}Определить
            </Button>
          </div>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={detectedLabel || 'Адрес или ориентир (опционально)'}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button className="w-full text-base" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Сохранить точку
        </Button>
      </div>
    </div>
  );
}
