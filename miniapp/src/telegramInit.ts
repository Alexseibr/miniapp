declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export function getStartParams() {
  const tg = window.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const startParam: string | undefined = unsafe.start_param;
  return { startParam, tg, unsafe };
}
