import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string[];
  onChange: (images: string[]) => void;
  max?: number;
}

export function ImageUploader({ value, onChange, max = 10 }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const canAddMore = value.length < max;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const remaining = max - value.length;
      const filesArray = Array.from(files).slice(0, remaining);

      if (!filesArray.length) {
        setError("Достигнут лимит изображений");
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        filesArray.forEach((file) => formData.append("images", file));

        const response = await fetchWithAuth("/api/upload/ad-images", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "Не удалось загрузить изображения");
        }

        const data = await response.json();
        const urls: string[] = Array.isArray(data?.urls) ? data.urls : [];

        if (!urls.length) {
          throw new Error("Сервер не вернул ссылки на файлы");
        }

        const nextImages = [...value, ...urls].slice(0, max);
        onChange(nextImages);
      } catch (uploadError) {
        setError((uploadError as Error).message || "Ошибка загрузки файлов");
      } finally {
        setIsUploading(false);
      }
    },
    [max, onChange, value]
  );

  const handleInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length) return;
      await handleFiles(files);
      event.target.value = "";
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const { files } = event.dataTransfer;
      setIsDragging(false);
      if (files?.length) {
        await handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleRemove = useCallback(
    async (url: string) => {
      setRemovingUrl(url);
      setError(null);
      try {
        const response = await fetchWithAuth("/api/upload/remove", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "Не удалось удалить файл");
        }

        onChange(value.filter((item) => item !== url));
      } catch (removeError) {
        setError((removeError as Error).message || "Ошибка удаления файла");
      } finally {
        setRemovingUrl(null);
      }
    },
    [onChange, value]
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const updated = [...value];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      onChange(updated);
    },
    [onChange, value]
  );

  const previews = useMemo(() => value, [value]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium">Перетащите фото сюда</p>
          <p className="text-sm text-muted-foreground">
            Поддерживаются JPG, PNG, WEBP. Максимум {max} фото.
          </p>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" disabled={!canAddMore || isUploading}>
              <label className="cursor-pointer">
                Выбрать файлы
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleInputChange}
                />
              </label>
            </Button>
            <p className="text-sm text-muted-foreground">или перетащите их в область</p>
          </div>
          {isUploading && <p className="text-sm text-muted-foreground">Загружаем фото…</p>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {previews.map((src, index) => (
          <div
            key={src}
            className="relative group"
            draggable
            onDragStart={() => setDraggingIndex(index)}
            onDragEnd={() => setDraggingIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingIndex !== null) {
                handleReorder(draggingIndex, index);
              }
              setDraggingIndex(null);
            }}
          >
            <div className="aspect-square w-full overflow-hidden rounded-lg border bg-muted/50">
              <img src={src} alt="Загруженное фото" className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => void handleRemove(src)}
              className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 opacity-0 group-hover:opacity-100 transition"
              disabled={removingUrl === src}
            >
              <X className="h-4 w-4" />
            </button>
            {draggingIndex !== null && draggingIndex === index && (
              <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none" />
            )}
          </div>
        ))}
      </div>

      {previews.length > 1 && (
        <p className="text-xs text-muted-foreground">Перетаскивайте миниатюры, чтобы изменить порядок.</p>
      )}

      {!previews.length && (
        <div className="h-40 rounded-lg border bg-muted/30 flex items-center justify-center text-muted-foreground">
          Нет загруженных фото
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
