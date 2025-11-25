interface TelegramPopupParams {
  title?: string;
  message: string;
  buttons: Array<{
    id?: string;
    type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
    text: string;
  }>;
}

interface AdPublishedPayload {
  type: 'ad_published';
  adId: string;
  title: string;
}

export function showPublishNotification(adTitle: string): void {
  const tg = (window as unknown as Record<string, unknown>).Telegram as {
    WebApp?: {
      showPopup?: (params: TelegramPopupParams) => void;
    };
  } | undefined;

  if (tg?.WebApp?.showPopup) {
    try {
      tg.WebApp.showPopup({
        title: 'Объявление опубликовано',
        message: `Ваше объявление "${adTitle}" теперь видно покупателям.`,
        buttons: [{ id: 'ok', type: 'default', text: 'Ок' }],
      });
    } catch (error) {
      console.error('Failed to show publish notification:', error);
    }
  }
}

type WebAppDataCallback = (data: { data: string }) => void;

export function setupPublishNotificationListener(): () => void {
  const handleWebAppData: WebAppDataCallback = (data) => {
    try {
      const payload = JSON.parse(data.data) as AdPublishedPayload;
      if (payload.type === 'ad_published' && payload.title) {
        showPublishNotification(payload.title);
      }
    } catch {
      // Ignore parse errors for non-JSON data
    }
  };

  const tg = (window as unknown as Record<string, unknown>).Telegram as {
    WebApp?: {
      onEvent?: (eventType: string, callback: WebAppDataCallback) => void;
      offEvent?: (eventType: string, callback: WebAppDataCallback) => void;
    };
  } | undefined;

  if (tg?.WebApp?.onEvent) {
    tg.WebApp.onEvent('web_app_data', handleWebAppData);
    
    return () => {
      tg?.WebApp?.offEvent?.('web_app_data', handleWebAppData);
    };
  }

  return () => {};
}
