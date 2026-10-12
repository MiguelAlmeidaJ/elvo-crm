import Image from 'next/image';

type BrandLogoProps = {
  variant?: 'dark' | 'white' | 'light';
  width?: number;
  height?: number;
  priority?: boolean;
};
const logos = {
  dark: '/brand/logo-dark.png',
  white: '/brand/logo-white.png',
  light: '/brand/logo-light.png',
} as const;

export function BrandLogo({ variant = 'dark', width = 200, height = 67, priority = false }: BrandLogoProps) {
  return <Image src={logos[variant]} alt="elvocrm — Conexões que impulsionam negócios."
    width={width} height={height} priority={priority} className="h-auto max-w-full object-contain object-left" />;
}
