export function LoaderScreen({ message = 'Загрузка...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-gray-600 text-sm">
      {message}
    </div>
  );
}
