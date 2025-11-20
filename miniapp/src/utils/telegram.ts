export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function getTelegramContext() {
  const WebApp = getTelegramWebApp();
  return {
    WebApp,
    initData: WebApp?.initData,
    initDataUnsafe: WebApp?.initDataUnsafe,
    themeParams: WebApp?.themeParams,
  };
}

export function parseAppMode(search: string) {
  const params = new URLSearchParams(search);
  return {
    niche: params.get('niche') || undefined,
    season: params.get('season') || undefined,
  };
}

export function openExternalLink(url: string) {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.openLink(url, { try_instant_view: true });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}
