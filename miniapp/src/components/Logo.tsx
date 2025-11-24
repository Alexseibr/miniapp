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
    'full': '/logos/ketmar_logo_rgb.svg',
    'sign': '/logos/ketmar_sign_rgb.svg',
    'full-mono': '/logos/ketmar_logo_monochrome.svg',
    'sign-mono': '/logos/ketmar_sign_monochrome.svg',
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
