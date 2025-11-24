import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ShieldCheck, Phone, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import http, { setAuthToken } from "@/lib/http";
import { TelegramLoginWidget } from "@/components/TelegramLoginWidget";

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, "Введите номер телефона")
    .regex(/^\+375\d{9}$/, "Неверный формат телефона"),
});

const codeSchema = z.object({
  code: z
    .string()
    .min(1, "Введите код из СМС")
    .regex(/^\d{4}$/, "Код должен содержать 4 цифры"),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: "",
    },
  });

  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleRequestCode = async (data: PhoneFormValues) => {
    setIsLoading(true);
    try {
      await http.post("/api/auth/sms/requestCode", { phone: data.phone });
      setPhoneNumber(data.phone);
      setStep("code");
      toast({
        title: "Код отправлен",
        description: "Проверьте СМС на указанном номере",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.response?.data?.message || "Не удалось отправить код",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (data: CodeFormValues) => {
    setIsLoading(true);
    try {
      const response = await http.post("/api/auth/admin/login", {
        phone: phoneNumber,
        code: data.code,
      });

      const { token, user } = response.data;

      // Backend has already validated admin role - just save token and redirect
      setAuthToken(token);
      toast({
        title: "Вход выполнен",
        description: `Добро пожаловать, ${user.firstName || user.username || "администратор"}!`,
      });
      navigate("/admin");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Не удалось выполнить вход";
      
      if (errorMessage.includes("истёк") || errorMessage.includes("expired")) {
        toast({
          variant: "destructive",
          title: "Срок действия кода истек",
          description: "Запросите новый код",
        });
      } else if (errorMessage.includes("неверен") || errorMessage.includes("wrong")) {
        toast({
          variant: "destructive",
          title: "Неверный код",
          description: "Проверьте код из СМС",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("phone");
    codeForm.reset();
  };

  const handleTelegramAuth = async (telegramUser: any) => {
    setIsLoading(true);
    try {
      const response = await http.post('/api/admin/auth/telegram-login', telegramUser);
      const { token, user } = response.data;
      
      setAuthToken(token);
      
      toast({
        title: '✅ Вход выполнен',
        description: `Добро пожаловать, ${user.firstName || user.username || "администратор"}!`,
      });
      
      navigate('/admin');
      
    } catch (error: any) {
      console.error('Telegram login failed:', error);
      
      toast({
        variant: 'destructive',
        title: '❌ Ошибка входа',
        description: error.response?.data?.message || 'Не удалось войти через Telegram',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md" data-testid="card-admin-login">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-[#3B73FC]" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="heading-admin-login">
            Вход для администраторов
          </CardTitle>
          <CardDescription data-testid="text-description">
            {step === "phone" 
              ? "Введите номер телефона для получения кода" 
              : "Введите код из СМС"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(handleRequestCode)} className="space-y-4">
                <FormField
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер телефона</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="tel"
                            placeholder="+375291234567"
                            className="pl-10"
                            disabled={isLoading}
                            data-testid="input-phone"
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-phone" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-request-code"
                >
                  {isLoading ? "Отправка..." : "Получить код"}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4" data-testid="text-phone-display">
                  Код отправлен на номер <strong>{phoneNumber}</strong>
                </div>
                <FormField
                  control={codeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>СМС-код</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="text"
                            placeholder="1234"
                            maxLength={4}
                            className="pl-10 text-center text-2xl tracking-widest"
                            disabled={isLoading}
                            data-testid="input-code"
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-code" />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Проверка..." : "Войти"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleBack}
                    disabled={isLoading}
                    data-testid="button-back"
                  >
                    Изменить номер
                  </Button>
                </div>
              </form>
            </Form>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">или войдите через Telegram</p>
            <div className="flex justify-center">
              <TelegramLoginWidget
                botName="KetmarM_bot"
                onAuth={handleTelegramAuth}
                buttonSize="large"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
