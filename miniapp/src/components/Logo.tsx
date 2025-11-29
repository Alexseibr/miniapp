import logoRgb from '@/assets/ketmar_logo_rgb.svg';

interface LogoProps {
  variant?: 'full' | 'sign' | 'full-mono' | 'sign-mono';
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

export default function Logo({ 
  variant = 'full', 
  className = '',
  style = {},
  width,
  height 
}: LogoProps) {
  const logoMap = {
    'full': logoRgb,
    'sign': logoRgb,
    'full-mono': logoRgb,
    'sign-mono': logoRgb,
  };

  const logoSrc = logoMap[variant];

  return (
    <img
      src={logoSrc}
      alt="KETMAR Market"
      className={className}
      style={{
        ...style,
        width: width || 'auto',
        height: height || 'auto',
      }}
      data-testid={`logo-${variant}`}
    />
  );
}

export function LogoFull(props: Omit<LogoProps, 'variant'>) {
  return <Logo variant="full" {...props} />;
}

export function LogoSign(props: Omit<LogoProps, 'variant'>) {
  return <Logo variant="sign" {...props} />;
}

export function LogoFullMono(props: Omit<LogoProps, 'variant'>) {
  return <Logo variant="full-mono" {...props} />;
}

export function LogoSignMono(props: Omit<LogoProps, 'variant'>) {
  return <Logo variant="sign-mono" {...props} />;
}
