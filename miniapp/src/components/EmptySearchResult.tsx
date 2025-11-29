import { useState, useMemo } from 'react';
import { Search, Bell, Loader2, MapPin, LogIn } from 'lucide-react';
import AdCardSmall from './AdCardSmall';
import { AdPreview } from '@/types';
import { getTelegramContext } from '@/utils/telegram';

interface EmptySearchResultProps {
  query: string;
  lat?: number;
  lng?: number;
  radiusKm: number;
  nearbyAds: AdPreview[];
  onAlertCreated?: () => void;
}

const API_BASE = '/api';

export default function EmptySearchResult({
  query,
  lat,
  lng,
  radiusKm,
  nearbyAds,
  onAlertCreated,
}: EmptySearchResultProps) {
  const telegramContext = useMemo(() => getTelegramContext(), []);
  const telegramId = telegramContext?.initDataUnsafe?.user?.id;
  const [alertCreated, setAlertCreated] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const handleCreateAlert = async () => {
    if (!telegramId || !query.trim()) return;

    setIsCreatingAlert(true);
    setAlertError(null);

    try {
      const response = await fetch(`${API_BASE}/search/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          query: query.trim(),
          lat,
          lng,
          radiusKm,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setAlertCreated(true);
        onAlertCreated?.();
      } else {
        setAlertError(data.error || 'Не удалось создать уведомление');
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
      setAlertError('Ошибка сети');
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const handleOpenTelegram = () => {
    window.open('https://t.me/KetmarM_bot', '_blank');
  };

  return (
    <div style={{ padding: '20px 16px' }} data-testid="empty-search-container">
      <div
        style={{
          background: 'rgba(10, 15, 26, 0.8)',
          borderRadius: 20,
          padding: 28,
          textAlign: 'center',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          backdropFilter: 'blur(10px)',
          marginBottom: 24,
        }}
        data-testid="empty-search-result"
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
          data-testid="icon-search-empty"
        >
          <Search
            size={32}
            color="#3B82F6"
            style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' }}
          />
        </div>

        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: '0 0 10px',
            color: '#F8FAFC',
            textShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
          }}
          data-testid="text-search-query"
        >
          «{query}» не найдено
        </h3>

        <p
          style={{
            fontSize: 15,
            color: '#94A3B8',
            margin: '0 0 24px',
            lineHeight: 1.5,
          }}
          data-testid="text-search-description"
        >
          Такого товара пока нет рядом с вами.
          <br />
          Мы оповестим вас, когда он появится!
        </p>

        {telegramId ? (
          <>
            {alertCreated ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '14px 20px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: 14,
                  color: '#22C55E',
                  fontSize: 15,
                  fontWeight: 600,
                }}
                data-testid="alert-created-success"
              >
                <Bell size={20} />
                Уведомление настроено
              </div>
            ) : (
              <button
                onClick={handleCreateAlert}
                disabled={isCreatingAlert}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: isCreatingAlert ? 'not-allowed' : 'pointer',
                  opacity: isCreatingAlert ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  minHeight: 52,
                  boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.2s',
                }}
                data-testid="button-create-alert"
              >
                {isCreatingAlert ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    <span data-testid="text-creating-alert">Настраиваем...</span>
                  </>
                ) : (
                  <>
                    <Bell size={20} />
                    <span data-testid="text-alert-cta">Оповестить о появлении</span>
                  </>
                )}
              </button>
            )}

            {alertError && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  color: '#EF4444',
                }}
                data-testid="text-alert-error"
              >
                {alertError}
              </p>
            )}
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
            }}
            data-testid="login-prompt-container"
          >
            <p
              style={{
                fontSize: 14,
                color: '#64748B',
                margin: 0,
              }}
              data-testid="text-login-prompt"
            >
              Войдите через Telegram, чтобы получать уведомления
            </p>
            <button
              onClick={handleOpenTelegram}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #0088CC, #00AAFF)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 48,
                boxShadow: '0 0 20px rgba(0, 136, 204, 0.3)',
              }}
              data-testid="button-login-telegram"
            >
              <LogIn size={20} />
              Открыть в Telegram
            </button>
          </div>
        )}
      </div>

      {nearbyAds.length > 0 && (
        <div data-testid="fallback-nearby-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <MapPin size={20} color="#3B82F6" />
            <h4
              style={{
                fontSize: 17,
                fontWeight: 600,
                margin: 0,
                color: '#F8FAFC',
              }}
              data-testid="text-nearby-title"
            >
              Товары рядом с вами
            </h4>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
            data-testid="nearby-ads-fallback-grid"
          >
            {nearbyAds.slice(0, 6).map((ad) => (
              <AdCardSmall key={ad._id} ad={ad} />
            ))}
          </div>

          {nearbyAds.length > 6 && (
            <p
              style={{
                textAlign: 'center',
                fontSize: 14,
                color: '#64748B',
                marginTop: 16,
              }}
              data-testid="text-more-ads-count"
            >
              И ещё {nearbyAds.length - 6} товаров рядом
            </p>
          )}
        </div>
      )}

      {nearbyAds.length === 0 && (
        <div
          style={{
            background: 'rgba(10, 15, 26, 0.6)',
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
            border: '1px solid rgba(59, 130, 246, 0.15)',
          }}
          data-testid="no-nearby-ads-message"
        >
          <MapPin size={28} color="#64748B" style={{ marginBottom: 12 }} />
          <p
            style={{
              fontSize: 14,
              color: '#64748B',
              margin: 0,
              lineHeight: 1.5,
            }}
            data-testid="text-no-nearby"
          >
            Товаров рядом пока нет.
            <br />
            Попробуйте увеличить радиус поиска.
          </p>
        </div>
      )}
    </div>
  );
}
