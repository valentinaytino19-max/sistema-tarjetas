import { ArrowClockwise } from '@phosphor-icons/react';

interface LottieLoaderProps {
  className?: string;
  size?: number;
}

export default function LottieLoader({ className = '', size = 120 }: LottieLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <ArrowClockwise className="animate-spin text-primary" style={{ width: size * 0.5, height: size * 0.5 }} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse mt-2">Cargando...</p>
    </div>
  );
}
