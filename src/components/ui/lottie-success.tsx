import { CheckCircle } from '@phosphor-icons/react';

interface LottieSuccessProps {
  message?: string;
  className?: string;
}

export default function LottieSuccess({ message = 'Operacion exitosa', className = '' }: LottieSuccessProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <CheckCircle className="w-20 h-20 text-success" weight="fill" />
      <p className="text-foreground text-lg font-medium mt-4">{message}</p>
    </div>
  );
}
