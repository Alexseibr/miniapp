import { useEffect, useRef } from 'react';

interface TelegramLoginWidgetProps {
  botName: string;
  onAuth: (user: any) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  requestAccess?: string;
}

export function TelegramLoginWidget({
  botName,
  onAuth,
  buttonSize = 'large',
  requestAccess = 'write'
}: TelegramLoginWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-userpic', 'true');
    script.setAttribute('data-radius', '10');
    script.async = true;
    
    (window as any).onTelegramAuth = (user: any) => {
      onAuth(user);
    };
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    
    if (widgetRef.current) {
      widgetRef.current.appendChild(script);
    }
    
    return () => {
      if (widgetRef.current) {
        widgetRef.current.innerHTML = '';
      }
      delete (window as any).onTelegramAuth;
    };
  }, [botName, buttonSize, onAuth, requestAccess]);

  return <div ref={widgetRef} data-testid="telegram-login-widget" />;
}
