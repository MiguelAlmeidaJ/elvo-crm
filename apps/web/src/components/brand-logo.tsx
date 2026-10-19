type BrandLogoProps = {
  variant?: 'dark' | 'white' | 'light';
  width?: number;
  height?: number;
  priority?: boolean;
};

const colors = {
  dark: { word: '#FFFFFF', accent: '#65E6C2' },
  white: { word: '#FFFFFF', accent: '#FFFFFF' },
  light: { word: '#101B2B', accent: '#16A085' },
} as const;

export function BrandLogo({ variant = 'dark', width = 200, height = 52 }: BrandLogoProps) {
  const color = colors[variant];

  return (
    <svg role="img" aria-label="ELVO CRM" viewBox="0 0 226 56" width={width} height={height} className="h-auto max-w-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 28C6 15.85 15.85 6 28 6h12v10H28c-6.63 0-12 5.37-12 12s5.37 12 12 12h12v10H28C15.85 50 6 40.15 6 28Z" fill={color.accent} />
      <path d="M34 18h18v8H34zM34 30h18v8H34z" fill={color.accent} />
      <text x="64" y="36" fill={color.word} fontFamily="Sora, Arial, sans-serif" fontSize="28" fontWeight="750" letterSpacing="-1.5">ELVO</text>
      <text x="145" y="35.5" fill={color.accent} fontFamily="Inter, Arial, sans-serif" fontSize="14" fontWeight="700" letterSpacing="2.5">CRM</text>
    </svg>
  );
}
