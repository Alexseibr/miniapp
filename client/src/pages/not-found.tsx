import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-10">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Страница не найдена</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Запрошенная страница не существует.</p>
        </CardContent>
      </Card>
    </div>
  );
}
