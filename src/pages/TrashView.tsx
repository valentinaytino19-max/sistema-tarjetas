import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash, MagnifyingGlass, ArrowCounterClockwise, Check, Warning } from '@phosphor-icons/react';
import type { Card as CardType, Group } from '../types';
import PhosphorIcon from '../components/PhosphorIcon';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import LottieEmpty from '../components/ui/lottie-empty';

interface Props {
  cards: CardType[];
  groups: Group[];
  onRestore: (cardId: string) => void;
  onPermanentDelete: (cardIds: string[]) => void;
  onEmptyTrash: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
};

export default function TrashView({ cards, groups, onRestore, onPermanentDelete, onEmptyTrash }: Props) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const [filterText, setFilterText] = useState('');

  const trashCards = cards.filter((c) => {
    const matchText = !filterText || c.groupName.toLowerCase().includes(filterText.toLowerCase());
    return c.deletedAt && matchText;
  });

  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCards.size === trashCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(trashCards.map((c) => c.id)));
    }
  };

  const handlePermanentDelete = () => {
    onPermanentDelete(Array.from(selectedCards));
    setSelectedCards(new Set());
    setShowConfirmDelete(false);
  };

  const handleEmptyTrash = () => {
    onEmptyTrash();
    setShowConfirmEmpty(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-5">
        <div className="bg-white rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trash className="w-5 h-5 text-muted-foreground" />
              Papelera
            </h2>
            <div className="text-sm text-muted-foreground mt-1 flex items-center">
              <Badge variant="destructive" className="mr-1.5">{trashCards.length}</Badge>
              registro(s) eliminado(s). Se borrarán permanentemente al vaciar la papelera.
            </div>
          </div>

          {trashCards.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowConfirmEmpty(true)}
            >
              <Trash className="w-4 h-4" />
              Vaciar Papelera
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar en papelera..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>

          {trashCards.length > 0 && (
            <Button
              variant={selectedCards.size === trashCards.length ? 'default' : 'outline'}
              size="sm"
              onClick={toggleAll}
            >
              {selectedCards.size === trashCards.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedCards.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground font-medium">
                <Badge variant="warning" className="mr-1.5">{selectedCards.size}</Badge>
                seleccionada(s)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => {
                    selectedCards.forEach((id) => onRestore(id));
                    setSelectedCards(new Set());
                  }}
                >
                  <ArrowCounterClockwise className="w-3.5 h-3.5" />
                  Restaurar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowConfirmDelete(true)}
                >
                  <Trash className="w-3.5 h-3.5" />
                  Eliminar Permanentemente
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {trashCards.length === 0 ? (
      <div className="bg-white rounded-3xl p-6">
          <LottieEmpty
            message="La papelera está vacía"
            subtitle="Los registros eliminados aparecerán aquí"
          />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {trashCards.map((card) => {
              const group = groups.find((g) => g.id === card.groupId);
              return (
                <motion.div
                  key={card.id}
                  variants={cardVariants}
                  layout
                   className={`group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-opacity opacity-75 ${
                    selectedCards.has(card.id) ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background' : ''
                  }`}
                  whileHover={{ opacity: 1, scale: 1.02 }}
                  onClick={() => toggleCard(card.id)}
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={card.imageUrl}
                      alt={card.groupName}
                      className="w-full h-full object-cover grayscale-[30%]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute inset-0 bg-red-500/10" />

                    <div className="absolute top-2 left-2">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                          selectedCards.has(card.id)
                            ? 'bg-red-600'
                            : 'bg-white/80'
                        }`}
                      >
                        {selectedCards.has(card.id) && (
                          <Check className="w-3 h-3 text-white" weight="bold" />
                        )}
                      </div>
                    </div>

                    <div className="absolute top-2 right-2">
                      <div className="bg-red-500/80 backdrop-blur-sm rounded-full p-1.5">
                        <Trash className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-semibold truncate">{card.groupName}</p>
                      <p className="text-white/70 text-[10px]">{card.date}</p>
                    </div>
                  </div>

                  <div className="px-3 py-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      {group && (
                        <>
                          {group.identifierType === 'emoji' && (
                            <PhosphorIcon name={group.emoji || 'Folder'} className="w-3 h-3 text-muted-foreground" />
                          )}
                          {group.identifierType === 'photo' && group.photoUrl && (
                            <img src={group.photoUrl} alt="" className="w-3 h-3 rounded-lg object-cover" />
                          )}
                          {group.identifierType === 'color' && (
                            <div className="w-2.5 h-2.5 rounded-lg" style={{ backgroundColor: group.color }} />
                          )}
                        </>
                      )}
                      <span className="text-[10px] font-semibold text-muted-foreground truncate">{card.groupName}</span>
                    </div>
                    {card.deletedAt && (
                      <p className="text-[9px] text-destructive">
                        Eliminado: {formatDate(card.deletedAt)}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="success"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(card.id);
                    }}
                    title="Restaurar"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100"
                  >
                    <ArrowCounterClockwise className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AnimatePresence>
          {showConfirmDelete && (
            <DialogContent>
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Warning className="w-5 h-5 text-destructive" />
                    Eliminar Permanentemente
                  </DialogTitle>
                  <DialogDescription>
                    Esta acción no se puede deshacer
                  </DialogDescription>
                </DialogHeader>

                <div className="bg-destructive/10 rounded-2xl p-4">
                  <p className="text-sm text-destructive">
                    ¿Estás seguro de eliminar <strong>{selectedCards.size} registro(s)</strong> de forma permanente?
                    Esta acción no se puede revertir y los datos se perderán para siempre.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowConfirmDelete(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handlePermanentDelete}
                  >
                    Eliminar Permanentemente
                  </Button>
                </div>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>

      <Dialog open={showConfirmEmpty} onOpenChange={setShowConfirmEmpty}>
        <AnimatePresence>
          {showConfirmEmpty && (
            <DialogContent>
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Trash className="w-5 h-5 text-destructive" />
                    Vaciar Papelera
                  </DialogTitle>
                  <DialogDescription>
                    Eliminar todos los registros
                  </DialogDescription>
                </DialogHeader>

                <div className="bg-destructive/10 rounded-2xl p-4">
                  <p className="text-sm text-destructive">
                    ¿Estás seguro de vaciar toda la papelera? Se eliminarán permanentemente{' '}
                    <strong>{trashCards.length} registro(s)</strong>. Esta acción no se puede deshacer.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowConfirmEmpty(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleEmptyTrash}
                  >
                    Vaciar Papelera
                  </Button>
                </div>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </div>
  );
}
