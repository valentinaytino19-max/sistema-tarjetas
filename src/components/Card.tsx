import { motion } from 'framer-motion';
import type { Card as CardType } from '../types';

interface Props {
  card: CardType;
  onClick?: () => void;
}

export default function Card({ card, onClick }: Props) {
  return (
    <motion.div
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-3xl overflow-hidden aspect-[3/4] flex flex-col"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <div className="relative flex-1 overflow-hidden">
        <motion.img
          src={card.imageUrl}
          alt={`Tarjeta de ${card.groupName}`}
          className="w-full h-full object-cover"
          loading="lazy"
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          <p className="text-white font-semibold text-sm leading-tight">
            {card.groupName}
          </p>
          <p className="text-white/70 text-xs mt-0.5">
            {new Date(card.date).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="absolute top-2.5 left-2.5">
          <span className="bg-white/20 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-xl font-medium">
            {card.groupName}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
