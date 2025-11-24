import { useEffect } from 'react';
import { useLocation } from 'wouter';
import axios from 'axios';
import { setAuthToken } from '@/lib/http';
import { useToast } from '@/hooks/use-toast';

export default function AdminAuthCallback() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Get token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        if (!token) {
          throw new Error('Токен не найден');
        }
        
        // Verify token with backend
        const response = await axios.get(`/api/admin/auth/verify-token?token=${token}`);
        const { token: jwtToken } = response.data;
        
        // Save JWT
        setAuthToken(jwtToken);
        
        // Redirect to admin panel
        navigate('/admin');
        
        toast({
          title: '✅ Вход выполнен',
          description: 'Добро пожаловать в админ-панель',
        });
        
      } catch (error: any) {
        console.error('Token verification failed:', error);
        
        toast({
          variant: 'destructive',
          title: '❌ Ошибка входа',
          description: error.response?.data?.message || 'Неверный или истекший токен',
        });
        
        // Redirect to login page
        navigate('/admin/login');
      }
    };
    
    verifyToken();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen" data-testid="loading-verify-token">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Проверка токена...</h2>
        <p className="text-muted-foreground">Пожалуйста, подождите</p>
      </div>
    </div>
  );
}
