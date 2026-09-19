import { motion } from 'framer-motion';
import type { Group } from '../types';
import PhosphorIcon from './PhosphorIcon';
import { DEFAULT_ICON } from '../constants/icons';
import { Progress } from './ui/progress';

interface Props {
  group: Group;
  cardCount: number;
  onClick: () => void;
}

export default function GroupFolder({ group, cardCount, onClick }: Props) {
  const progress = Math.min((cardCount / group.validator) * 100, 100);

  const renderVisualHeader = () => {
    if (group.identifierType === 'photo' && group.photoUrl) {
      return (
        <>
          <img src={group.photoUrl} alt={group.name} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <span className="text-xs font-bold px-3 py-1 rounded-xl text-white inline-block" style={{ backgroundColor: group.color }}>
              {cardCount} / {group.validator}
            </span>
          </div>
        </>
      );
    }

    if (group.identifierType === 'emoji') {
      return (
        <>
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${group.color}15 0%, ${group.color}05 100%)` }} />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 25% 40%, ${group.color} 1px, transparent 1px), radial-gradient(circle at 75% 60%, ${group.color} 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
          <motion.div className="relative z-10" whileHover={{ scale: 1.12, rotate: 5 }} transition={{ type: 'spring' as const, stiffness: 400, damping: 10 }}>
            <PhosphorIcon name={group.emoji || DEFAULT_ICON} className="w-14 h-14" />
          </motion.div>
          <div className="absolute top-3 right-3">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl text-white" style={{ backgroundColor: group.color }}>
              {cardCount} / {group.validator}
            </span>
          </div>
        </>
      );
    }

    // color (default)
    return (
      <>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${group.color} 0%, ${group.color}cc 50%, ${group.color}99 100%)` }} />
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%">
            <defs>
              <pattern id={`grid-${group.id}`} width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${group.id})`} />
          </svg>
        </div>
        <motion.div className="relative z-10" whileHover={{ scale: 1.12, rotate: 5 }} transition={{ type: 'spring' as const, stiffness: 400, damping: 10 }}>
          <PhosphorIcon name="Folder" className="w-14 h-14 text-white" />
        </motion.div>
        <div className="absolute top-3 right-3">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white/25 backdrop-blur-md text-white">
            {cardCount} / {group.validator}
          </span>
        </div>
      </>
    );
  };

  return (
    <motion.div
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-secondary/60"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="h-36 relative flex items-center justify-center overflow-hidden">
        {renderVisualHeader()}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          {group.identifierType === 'emoji' && (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: group.color + '12' }}>
              <PhosphorIcon name={group.emoji || DEFAULT_ICON} className="w-4 h-4" />
            </div>
          )}
          <h3 className="font-bold text-foreground text-sm truncate">
            {group.name}
          </h3>
        </div>

        {group.identifierType === 'color' && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
            <span className="text-[11px] text-muted-foreground font-mono">{group.color}</span>
          </div>
        )}

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>Progreso</span>
            <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" indicatorClassName="rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}
