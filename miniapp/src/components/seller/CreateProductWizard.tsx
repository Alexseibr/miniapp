import { useEffect, useMemo, useState } from 'react';
import { Camera, Image as ImageIcon, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, Lightbulb } from 'lucide-react';
import { fetchCategories } from '@/api/categories';
import { createDraftProduct, DraftProductPayload } from '@/api/myShop';
import { CategoryNode } from '@/types';
import { usePlatform } from '@/platform/PlatformProvider';
import { Button } from '@/components/ui/button';

interface CreateProductWizardProps {
  onCreated: () => void;
}

function suggestProductMeta(title: string): { categoryId?: string; suggestedDescription?: string } {
  const lower = title.toLowerCase();
  if (lower.includes('морков')) return { categoryId: 'vegetables', suggestedDescription: 'Свежая морковь с грядки, чистая и сладкая.' };
  if (lower.includes('малина')) return { categoryId: 'berries', suggestedDescription: 'Ароматная малина, собранная вручную.' };
  if (lower.includes('кофе')) return { categoryId: 'coffee', suggestedDescription: 'Зерновой кофе, свежеобжаренный, ароматный.' };
  return {};
}

function flattenCategories(categories: CategoryNode[]): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];

  categories.forEach((cat) => {
    result.push({ value: cat.slug, label: cat.name });
    if (cat.subcategories) {
      cat.subcategories.forEach((sub) => {
        result.push({ value: sub.slug, label: `${cat.name} / ${sub.name}` });
      });
    }
  });

  return result;
}

export function CreateProductWizard({ onCreated }: CreateProductWizardProps) {
  const { getAuthToken } = usePlatform();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [measureUnit, setMeasureUnit] = useState('kg');
  const [suggestedDescription, setSuggestedDescription] = useState('');
  const [suggestedCategoryId, setSuggestedCategoryId] = useState('');
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!title) return;
    const suggestion = suggestProductMeta(title);
    if (suggestion.categoryId) {
      setSuggestedCategoryId(suggestion.categoryId);
    }
    if (suggestion.suggestedDescription && !description) {
      setSuggestedDescription(suggestion.suggestedDescription);
      setDescription(suggestion.suggestedDescription);
    }
  }, [title, description]);

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);

  const canGoNext = () => {
    if (step === 2) return title.trim().length > 1;
    if (step === 4) return Boolean(categoryId || suggestedCategoryId);
    return true;
  };

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = await getAuthToken();
    const uploads = Array.from(files).slice(0, 4 - photos.length);
    setUploading(true);
    const uploaded: string[] = [];

    for (const file of uploads) {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          uploaded.push(data.url);
        }
      }
    }

    setPhotos((prev) => [...prev, ...uploaded].slice(0, 4));
    setUploading(false);
  };

  const goNext = () => {
    if (step < 6) {
      setStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Название обязательно');
      return;
    }
    const finalCategory = categoryId || suggestedCategoryId;
    if (!finalCategory) {
      setError('Выберите категорию');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const token = await getAuthToken();
      const payload: DraftProductPayload = {
        title: title.trim(),
        description: description.trim(),
        categoryId: finalCategory,
        photos,
        measureUnit,
      };
      await createDraftProduct(payload, token || undefined);
      setCreated(true);
      onCreated();
    } catch (err) {
      console.error('Create draft error', err);
      setError('Не удалось сохранить товар. Проверьте данные.');
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <div className="p-4 space-y-4">
        <div className="p-4 rounded-2xl bg-green-50 border border-green-100 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold">Товар сохранён в черновики</h3>
            <p className="text-sm text-muted-foreground">
              Теперь задайте цену и опубликуйте его во вкладке «Товары».
            </p>
          </div>
        </div>
        <Button className="w-full" onClick={onCreated}>
          Перейти к товарам
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Создать товар</h2>
        <div className="text-sm text-muted-foreground">Шаг {step} из 6</div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Добавьте фотографии товара</h3>
          <p className="text-sm text-muted-foreground">C фото товар продаётся лучше.</p>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => {
              const url = photos[idx];
              return (
                <label
                  key={idx}
                  className="aspect-square rounded-xl border border-dashed flex items-center justify-center cursor-pointer bg-slate-50 overflow-hidden"
                >
                  {url ? (
                    <img src={url} alt="Фото товара" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground text-sm">
                      <Camera className="w-6 h-6 mb-1" />
                      Фото
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadPhotos(e.target.files)}
                  />
                </label>
              );
            })}
          </div>
          {uploading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Загружаем фото...
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Название товара</h3>
          <input
            className="w-full h-12 rounded-lg border px-3 text-base"
            placeholder="Морковь свежая, Малина, Кофе зерновой"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Коротко и понятно, без лишних слов.</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Описание товара</h3>
          <textarea
            className="w-full min-h-[120px] rounded-lg border px-3 py-2 text-sm"
            placeholder="Добавьте описание или оставьте предложенный вариант"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {suggestedDescription && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-100 rounded-lg p-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Мы предложили описание — можно отредактировать.
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Группа товаров</h3>
          {suggestedCategoryId && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-2">
              <Sparkles className="w-4 h-4" /> Категория предложена автоматически
            </div>
          )}
          <select
            className="w-full h-12 rounded-lg border px-3"
            value={categoryId || suggestedCategoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Выберите категорию</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Единица измерения</h3>
          <select
            className="w-full h-12 rounded-lg border px-3"
            value={measureUnit}
            onChange={(e) => setMeasureUnit(e.target.value)}
          >
            <option value="kg">кг</option>
            <option value="pcs">шт</option>
            <option value="ltr">литр</option>
            <option value="pack">упаковка</option>
            <option value="portion">порция</option>
          </select>
          <p className="text-xs text-muted-foreground">Можно расширять список позже.</p>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Готово к созданию</h3>
          <div className="rounded-xl border bg-slate-50 p-3 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              {photos.length > 0 ? `${photos.length} фото` : 'Без фото (можно добавить позже)'}
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              {title || 'Название не заполнено'}
            </div>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-muted-foreground" />
              {measureUnit ? `Ед. измерения: ${measureUnit}` : 'Ед. измерения не выбрана'}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Мы создадим черновик без цены. Задайте цену и остаток во вкладке «Товары».
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Создать товар
          </Button>
        </div>
      )}

      {step < 6 && (
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={goBack} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Назад
          </Button>
          <Button onClick={step === 5 ? () => setStep(6) : goNext} disabled={!canGoNext()}>
            Далее <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
