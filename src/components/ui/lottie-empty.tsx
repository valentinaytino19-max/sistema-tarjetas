import { FolderDashed } from '@phosphor-icons/react';

interface LottieEmptyProps {
  message?: string;
  subtitle?: string;
  className?: string;
  icon?: React.ReactNode;
}

export default function LottieEmpty({ message = 'Sin contenido', subtitle, className = '', icon }: LottieEmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <div className="w-40 h-40 flex items-center justify-center">
        {icon || <FolderDashed className="w-20 h-20 text-muted-foreground/30" weight="fill" />}
      </div>
      <p className="text-muted-foreground text-lg font-medium mt-2">{message}</p>
      {subtitle && <p className="text-muted-foreground/60 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
