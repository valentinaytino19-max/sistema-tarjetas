import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretRight, House, MagnifyingGlass, Trash, Plus, Warning, Camera, Images } from '@phosphor-icons/react';
import type { Group, Card as CardType } from '../types';
import Card from '../components/Card';
import GroupFolder from '../components/GroupFolder';
import PhosphorIcon from '../components/PhosphorIcon';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  onSoftDelete: (cardIds: string[]) => void;
  onUpload: (files: File[], groupId: string, groupName: string) => void;
}

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function GroupBreadcrumb({ chain, onNavigate }: { chain: Group[]; onNavigate: (g: Group | null) => void }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm overflow-x-auto">
      <button
        onClick={() => onNavigate(null)}
        className="text-primary hover:text-primary/80 font-medium transition-colors shrink-0"
      >
        Inicio
      </button>
      {chain.map((g, i) => (
        <div key={g.id} className="flex items-center gap-1.5 shrink-0">
          <CaretRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => onNavigate(g)}
            className={`flex items-center gap-1.5 min-w-0 ${
              i === chain.length - 1
                ? 'text-foreground font-semibold'
                : 'text-primary hover:text-primary/80 font-medium'
            }`}
          >
            {g.identifierType === 'emoji' && (
              <span className="shrink-0">
                <PhosphorIcon name={g.emoji || 'Folder'} className="w-4 h-4" />
              </span>
            )}
            {g.identifierType === 'photo' && g.photoUrl && (
              <img src={g.photoUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
            )}
            {g.identifierType === 'color' && (
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: g.color }}
              />
            )}
            <span className="truncate">{g.name}</span>
          </button>
        </div>
      ))}
    </nav>
  );
}

function GroupHeader({ group, count }: { group: Group; count: number }) {
  return (
    <motion.div
      className="flex items-center gap-3 mb-4"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {group.identifierType === 'emoji' && (
        <PhosphorIcon name={group.emoji || 'Folder'} className="w-10 h-10" />
      )}
      {group.identifierType === 'photo' && group.photoUrl && (
        <img
          src={group.photoUrl}
          alt=""
          className="w-10 h-10 rounded-xl object-cover"
        />
      )}
      {group.identifierType === 'color' && (
        <div
          className="w-10 h-10 rounded-xl"
          style={{ backgroundColor: group.color }}
        />
      )}
      <div>
        <h2 className="text-lg font-bold text-foreground">{group.name}</h2>
        <p className="text-sm text-muted-foreground">{count} tarjeta(s)</p>
      </div>
    </motion.div>
  );
}

export default function FrontendView({ cards, groups, onSoftDelete, onUpload }: Props) {
  const [navStack, setNavStack] = useState<Group[]>([]);
  const [searchClient, setSearchClient] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchZone, setSearchZone] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  const currentParentId = navStack.length > 0 ? navStack[navStack.length - 1].id : undefined;
  const currentGroup = navStack.length > 0 ? navStack[navStack.length - 1] : null;

  const getDescendantIds = (groupId: string): string[] => {
    const children = groups.filter((g) => g.parentId === groupId);
    let ids: string[] = [groupId];
    for (const child of children) {
      ids = ids.concat(getDescendantIds(child.id));
    }
    return ids;
  };

  const visibleGroups = groups.filter((g) => g.parentId === currentParentId);

  const getRecursiveCardCount = (groupId: string) => {
    const descendantIds = getDescendantIds(groupId);
    return cards.filter((c) => descendantIds.includes(c.groupId)).length;
  };

  const filteredCards = cards.filter((card) => {
    const matchClient =
      !searchClient || card.groupName.toLowerCase().includes(searchClient.toLowerCase());
    const matchDate = !searchDate || card.date === searchDate;
    const matchZone = !searchZone || card.groupId === searchZone;

    let matchGroup = false;
    if (currentGroup) {
      const descendantIds = getDescendantIds(currentGroup.id);
      matchGroup = descendantIds.includes(card.groupId);
    }

    return matchClient && matchDate && matchZone && (currentGroup ? matchGroup : true);
  });

  const navigateTo = (group: Group | null) => {
    if (!group) {
      setNavStack([]);
      return;
    }
    const existingIdx = navStack.findIndex((g) => g.id === group.id);
    if (existingIdx >= 0) {
      setNavStack(navStack.slice(0, existingIdx + 1));
    } else {
      setNavStack([...navStack, group]);
    }
  };

  const handleGroupClick = (group: Group) => {
    setNavStack([...navStack, group]);
  };

  const handleDeleteCard = (cardId: string) => {
    setShowDeleteConfirm(cardId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      onSoftDelete([showDeleteConfirm]);
      setShowDeleteConfirm(null);
    }
  };

  const [showUploadMenu, setShowUploadMenu] = useState(false);

  const handleUploadCamera = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentGroup) return;
    onUpload(Array.from(files), currentGroup.id, currentGroup.name);
    e.target.value = '';
    setShowUploadMenu(false);
  };

  const handleUploadGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentGroup) return;
    onUpload(Array.from(files), currentGroup.id, currentGroup.name);
    e.target.value = '';
    setShowUploadMenu(false);
  };

  const showSubgroups = visibleGroups.length > 0;

  return (
    <div className="min-h-full">
      {/* Header bento */}
      <div className="bg-white rounded-3xl sticky top-0 z-20 p-5">
        <div className="space-y-4">
          {navStack.length > 0 ? (
            <GroupBreadcrumb chain={navStack} onNavigate={navigateTo} />
          ) : (
            <div className="flex items-center gap-1.5 text-sm">
              <House className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">Mis Zonas / Grupos</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por cliente..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
                className="pl-10 bg-secondary rounded-xl"
              />
            </div>

            <Input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-secondary rounded-xl"
            />

            <select
              value={searchZone}
              onChange={(e) => setSearchZone(e.target.value)}
              className="flex h-10 w-full rounded-xl bg-secondary px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            >
              <option value="">Todas las zonas</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        <AnimatePresence mode="wait">
          <motion.div key={currentGroup?.id || 'root'} {...pageTransition}>
            {showSubgroups && (
              <>
                <motion.h2
                  className="text-lg font-bold text-foreground mb-4"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentGroup
                    ? `Subgrupos de ${currentGroup.name}`
                    : 'Mis Zonas / Grupos'}
                </motion.h2>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {visibleGroups.map((group) => (
                    <motion.div key={group.id} variants={staggerItem}>
                      <GroupFolder
                        group={group}
                        cardCount={getRecursiveCardCount(group.id)}
                        onClick={() => handleGroupClick(group)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}

            {currentGroup && (
              <>
                <GroupHeader group={currentGroup} count={filteredCards.length} />

                {filteredCards.length === 0 ? (
                  <LottieEmpty
                    message="No hay tarjetas en esta zona"
                    subtitle="Sube la primera tarjeta usando el botón +"
                  />
                ) : (
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {filteredCards.map((card) => (
                      <motion.div
                        key={card.id}
                        className="relative group"
                        variants={staggerItem}
                        layout
                      >
                        <Card card={card} onClick={() => setSelectedCard(card)} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id);
                          }}
                           className="absolute top-2 right-2 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          title="Enviar a papelera"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            )}

            {!currentGroup && !showSubgroups && (
              <LottieEmpty
                message="Selecciona una zona para comenzar"
                subtitle="Navega por tus grupos para ver las tarjetas"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FAB Upload Buttons */}
      <AnimatePresence>
        {currentGroup && (
          <>
            <AnimatePresence>
              {showUploadMenu && (
                <>
                  <motion.div
                    className="fixed inset-0 z-30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowUploadMenu(false)}
                  />
                  <motion.div
                    className="fixed bottom-24 right-6 z-40 bg-white rounded-2xl shadow-lg p-2 space-y-1 border border-secondary/60"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors">
                      <Camera className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Tomar foto</p>
                        <p className="text-xs text-muted-foreground">Usar la cámara del dispositivo</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleUploadCamera}
                      />
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors">
                      <Images className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Subir imágenes</p>
                        <p className="text-xs text-muted-foreground">Seleccionar del galería</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleUploadGallery}
                      />
                    </label>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            <motion.button
              className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
              aria-label="Subir imagen"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <Dialog
        open={showDeleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setShowDeleteConfirm(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center shrink-0">
                <Warning className="w-6 h-6 text-warning" />
              </div>
              <div>
                <DialogTitle>Enviar a Papelera</DialogTitle>
                <DialogDescription>Puedes restaurarlo desde la Papelera</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="bg-warning/5 rounded-xl p-4">
            <p className="text-sm text-foreground/80">
              ¿Estás seguro de enviar este registro a la papelera? Podrás restaurarlo o
              eliminarlo permanentemente desde el módulo de Papelera.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="warning"
              className="flex-1 rounded-xl"
              onClick={confirmDelete}
            >
              Enviar a Papelera
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedCard && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedCard(null)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl overflow-hidden shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 aspect-[3/4] md:aspect-auto relative">
                  <img
                    src={selectedCard.imageUrl}
                    alt={selectedCard.groupName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="md:w-1/2 p-6 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedCard.groupName}</h2>
                    <p className="text-sm text-muted-foreground mt-1">Detalles de la tarjeta</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-secondary rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</span>
                        <span className="text-sm font-medium text-foreground">
                          {new Date(selectedCard.date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grupo</span>
                        <span className="text-sm font-medium text-foreground">{selectedCard.groupName}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</span>
                        <span className="text-xs font-mono text-muted-foreground">{selectedCard.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => setSelectedCard(null)}
                    >
                      Cerrar
                    </Button>
                    <Button
                      variant="warning"
                      className="flex-1 rounded-xl"
                      onClick={() => {
                        handleDeleteCard(selectedCard.id);
                        setSelectedCard(null);
                      }}
                    >
                      <Trash className="w-4 h-4" />
                      Enviar a Papelera
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
