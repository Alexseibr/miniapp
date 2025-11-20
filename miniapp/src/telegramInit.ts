import { useEffect, useState } from 'react';

const getStartParam = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tgWebAppStartParam') || urlParams.get('start_param') || '';
};

export const useTelegramInit = () => {
  const [startParam, setStartParam] = useState<string>('');

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      if (tg.initDataUnsafe?.start_param) {
        setStartParam(tg.initDataUnsafe.start_param);
        return;
      }
    }
    setStartParam(getStartParam());
  }, []);

  return startParam;
};
