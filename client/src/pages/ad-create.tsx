import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithAuth } from "@/lib/auth";

interface Subcategory {
  code: string;
  name: string;
}

interface Category {
  code: string;
  name: string;
  subcategories: Subcategory[];
}

export default function AdCreate() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    subcategory: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetchWithAuth("/api/categories");
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить категории");
      }
    };

    void loadCategories();
  }, []);

  const availableSubcategories = useMemo(() => {
    return categories.find((cat) => cat.code === form.category)?.subcategories ?? [];
  }, [categories, form.category]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const uploadSelectedFiles = async () => {
    if (!selectedFiles.length) {
      setError("Выберите файлы для загрузки");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const urls: string[] = [];

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetchWithAuth("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Ошибка загрузки файла");
        }

        const data = await response.json();
        if (Array.isArray(data.urls)) {
          urls.push(...data.urls);
        }
      }

      setUploadedImages((prev) => Array.from(new Set([...prev, ...urls])));
      setSelectedFiles([]);
      setPreviews([]);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить файлы. Попробуйте снова.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        subcategory: form.subcategory,
        images: uploadedImages,
      };

      const response = await fetchWithAuth("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Не удалось сохранить объявление");
      }

      const data = await response.json();
      alert("Объявление сохранено!");
      navigate(`/ads/${data._id}`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Ошибка сохранения объявления");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Создание объявления</h1>
          <p className="text-muted-foreground">
            Заполните поля, загрузите фотографии и отправьте форму для публикации объявления.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Данные объявления</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Заголовок</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Цена (BYN)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Опишите товар или услугу"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Категория</Label>
                  <select
                    id="category"
                    className="w-full border rounded-md p-2"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))
                    }
                    required
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="subcategory">Подкатегория</Label>
                  <select
                    id="subcategory"
                    className="w-full border rounded-md p-2"
                    value={form.subcategory}
                    onChange={(e) => setForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                    disabled={!form.category}
                    required
                  >
                    <option value="">Выберите подкатегорию</option>
                    {availableSubcategories.map((sub) => (
                      <option key={sub.code} value={sub.code}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Фотографии</Label>
                <Input type="file" multiple onChange={handleFileChange} />
                {previews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {previews.map((src) => (
                      <img key={src} src={src} alt="preview" className="rounded-md h-28 w-full object-cover" />
                    ))}
                  </div>
                )}
                <Button type="button" onClick={uploadSelectedFiles} disabled={isUploading}>
                  {isUploading ? "Загружается..." : "Загрузить фото"}
                </Button>
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {uploadedImages.map((src) => (
                      <img key={src} src={src} alt="uploaded" className="rounded-md h-28 w-full object-cover" />
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Сохраняем..." : "Создать объявление"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
