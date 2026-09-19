import { Warning } from '@phosphor-icons/react';

interface LottieErrorProps {
  message?: string;
  className?: string;
}

export default function LottieError({ message = 'Algo salio mal', className = '' }: LottieErrorProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <Warning className="w-20 h-20 text-warning" weight="fill" />
      <p className="text-muted-foreground text-lg font-medium mt-2">{message}</p>
    </div>
  );
}
