import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken, setCurrentUser } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("+");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCode = async () => {
    setLoading(true);
    setError(null);
    setDevCode(null);
    try {
      const response = await fetch("/api/auth/requestCode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Не удалось отправить код");
      }

      setDevCode(data?.code || null);
      setStep(2);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Не удалось выполнить вход");
      }

      setToken(data.token);
      setCurrentUser(data.user);
      navigate("/account");
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void requestCode();
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="phone">Телефон</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+375291234567"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Отправляем..." : "Получить код"}
      </Button>
    </form>
  );

  const renderCodeStep = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleLogin();
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="code">Код из SMS</Label>
        <Input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="1234"
        />
        {devCode && <p className="text-xs text-muted-foreground">Код: {devCode}</p>}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Входим..." : "Войти"}
      </Button>

      <button type="button" className="text-sm text-primary" onClick={() => setStep(1)}>
        Вернуться к вводу телефона
      </button>
    </form>
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Вход по телефону</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {step === 1 ? renderPhoneStep() : renderCodeStep()}
        </CardContent>
      </Card>
    </div>
  );
}
