import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Image, CaretDown, Pencil, Trash, ArrowsLeftRight, Check, Warning, Palette, Smiley, Camera } from '@phosphor-icons/react';
import type { Group, Card as CardType, IdentifierType } from '../types';
import { createGroup, updateGroup, deleteGroups } from '../services/groups';
import { moveCards as moveCardsService } from '../services/cards';
import { uploadToR2 } from '../lib/r2';
import PhosphorIcon from '../components/PhosphorIcon';
import { ICON_PRESETS, DEFAULT_ICON } from '../constants/icons';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.03, transition: { duration: 0.2 } },
};

const buttonHover = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.15 } },
};

function buildTree(groups: Group[], parentId?: string, depth = 0): { group: Group; depth: number; childCount: number }[] {
  const children = groups.filter((g) => g.parentId === parentId);
  const result: { group: Group; depth: number; childCount: number }[] = [];
  for (const child of children) {
    const descendants = buildTree(groups, child.id, depth + 1);
    result.push({ group: child, depth, childCount: descendants.length });
    result.push(...descendants);
  }
  return result;
}

function getDescendantIds(groups: Group[], groupId: string): string[] {
  const children = groups.filter((g) => g.parentId === groupId);
  let ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    ids = ids.concat(getDescendantIds(groups, child.id));
  }
  return ids;
}

interface Props {
  cards: CardType[];
  groups: Group[];
  onSoftDelete: (cardIds: string[]) => void;
  onGroupsChange: (groups: Group[]) => void;
}

export default function BackOfficeView({ cards, groups, onSoftDelete, onGroupsChange }: Props) {
  const [activeTab, setActiveTab] = useState<'groups' | 'files'>('groups');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddSubgroup, setShowAddSubgroup] = useState<string | null>(null);
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('#3b82f6');
  const [groupValidator, setGroupValidator] = useState(30);
  const [identifierType, setIdentifierType] = useState<IdentifierType>('color');
  const [groupEmoji, setGroupEmoji] = useState(DEFAULT_ICON);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState('');
  const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
  const [groupParentId, setGroupParentId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const treeItems = buildTree(groups);

  const resetGroupForm = () => {
    setGroupName('');
    setGroupColor('#3b82f6');
    setGroupValidator(30);
    setIdentifierType('color');
    setGroupEmoji(DEFAULT_ICON);
    setGroupPhotoPreview('');
    setGroupPhotoFile(null);
    setGroupParentId(undefined);
    setEditingGroup(null);
    setShowGroupForm(false);
    setShowAddSubgroup(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupPhotoFile(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) return;
    const parentId = showAddSubgroup || groupParentId;

    setSaving(true);
    try {
      let photoUrl: string | undefined = identifierType === 'photo' ? groupPhotoPreview || undefined : undefined;

      if (identifierType === 'photo' && groupPhotoFile) {
        photoUrl = await uploadToR2(groupPhotoFile);
      }

      if (editingGroup) {
        const updated = {
          name: groupName,
          color: groupColor,
          validator: groupValidator,
          identifierType,
          emoji: identifierType === 'emoji' ? groupEmoji : undefined,
          photoUrl,
          parentId,
        };
        const saved = await updateGroup(editingGroup.id, updated);
        onGroupsChange(groups.map((g) => (g.id === editingGroup.id ? saved : g)));
      } else {
        const newGroup = await createGroup({
          name: groupName,
          color: groupColor,
          validator: groupValidator,
          identifierType,
          emoji: identifierType === 'emoji' ? groupEmoji : undefined,
          photoUrl,
          parentId,
        });
        onGroupsChange([...groups, newGroup]);
      }
      resetGroupForm();
    } catch (err) {
      console.error('Error saving group:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupColor(group.color);
    setGroupValidator(group.validator);
    setIdentifierType(group.identifierType);
    setGroupEmoji(group.emoji || DEFAULT_ICON);
    setGroupPhotoPreview(group.photoUrl || '');
    setGroupPhotoFile(null);
    setGroupParentId(group.parentId);
    setShowGroupForm(true);
  };

  const handleAddSubgroup = (parentId: string) => {
    resetGroupForm();
    setShowAddSubgroup(parentId);
    setShowGroupForm(true);
  };

  const handleDeleteGroup = (id: string) => {
    const group = groups.find((g) => g.id === id);
    if (group) {
      setGroupToDelete(group);
      setDeleteConfirmText('');
    }
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    const descendantIds = getDescendantIds(groups, groupToDelete.id);
    const idsToRemove = [groupToDelete.id, ...descendantIds];
    try {
      await deleteGroups(idsToRemove);
      onGroupsChange(groups.filter((g) => !idsToRemove.includes(g.id)));
    } catch (err) {
      console.error('Error deleting groups:', err);
    } finally {
      setGroupToDelete(null);
      setDeleteConfirmText('');
    }
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const toggleAllCards = () => {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map((c) => c.id)));
    }
  };

  const handleMoveCards = async (targetGroupId: string) => {
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    if (!targetGroup) return;
    try {
      await moveCardsService(Array.from(selectedCards), targetGroupId, targetGroup.name);
      setSelectedCards(new Set());
      setShowMoveModal(false);
    } catch (err) {
      console.error('Error moving cards:', err);
    }
  };

  const handleSendToTrash = () => {
    onSoftDelete(Array.from(selectedCards));
    setSelectedCards(new Set());
    setShowTrashConfirm(false);
  };

  const renderGroupIdentifier = (group: Group, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };
    if (group.identifierType === 'photo' && group.photoUrl) {
      return <img src={group.photoUrl} alt={group.name} className={`${sizeClasses[size]} rounded-xl object-cover shrink-0`} />;
    }
    if (group.identifierType === 'emoji') {
      return (
        <div className={`${sizeClasses[size]} flex items-center justify-center shrink-0`}>
          <PhosphorIcon name={group.emoji || DEFAULT_ICON} className="w-5 h-5" />
        </div>
      );
    }
    return <div className={`${sizeClasses[size]} rounded-xl shrink-0`} style={{ backgroundColor: group.color }} />;
  };

  const availableParentGroups = groups.filter((g) => {
    if (editingGroup) {
      return g.id !== editingGroup.id && !getDescendantIds(groups, editingGroup.id).includes(g.id);
    }
    return true;
  });

  const treeMoveItems = buildTree(groups);

  return (
    <div className="min-h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'groups' | 'files')}>
        <div className="bg-secondary/60 sticky top-0 z-20 p-2">
          <TabsList className="w-full sm:w-auto justify-start h-auto p-1.5 bg-secondary rounded-2xl gap-1 border border-secondary/60">
            <TabsTrigger
              value="groups"
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:text-primary hover:bg-white/60 transition-all"
            >
              Gestión de Grupos
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:text-primary hover:bg-white/60 transition-all"
            >
              Gestión de Archivos
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-5">
          <TabsContent value="groups">
            <motion.div
              key="groups-tab"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground">Zonas / Grupos</h2>
                <motion.div variants={buttonHover} initial="rest" whileHover="hover">
                  <Button
                    onClick={() => { resetGroupForm(); setShowGroupForm(true); }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Grupo
                  </Button>
                </motion.div>
              </div>

              {/* Group Form Dialog */}
              <Dialog open={showGroupForm} onOpenChange={setShowGroupForm}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingGroup ? 'Editar Grupo' : showAddSubgroup ? 'Nuevo Subgrupo' : 'Nuevo Grupo'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingGroup
                        ? 'Modifica los datos del grupo existente.'
                        : 'Completa los campos para crear un nuevo grupo.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5 mt-2">
                    {!showAddSubgroup && (
                      <div className="space-y-2">
                        <Label>Grupo Padre (opcional)</Label>
                        <Select
                          value={groupParentId || '__root__'}
                          onValueChange={(v) => setGroupParentId(v === '__root__' ? undefined : v)}
                        >
                          <SelectTrigger className="bg-secondary rounded-2xl focus:ring-2 focus:ring-primary/30 focus:bg-white">
                            <SelectValue placeholder="Sin padre (grupo raíz)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__root__">Sin padre (grupo raíz)</SelectItem>
                            {availableParentGroups.filter((g) => !g.parentId).map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {showAddSubgroup && (
                      <div className="bg-primary/5 rounded-xl px-4 py-2.5 text-sm text-primary">
                        Creando subgrupo de: <strong>{groups.find((g) => g.id === showAddSubgroup)?.name}</strong>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Nombre del grupo"
                        className="bg-secondary rounded-2xl focus:ring-2 focus:ring-primary/30 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Identificador Visual</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { type: 'color' as IdentifierType, label: 'Color', Icon: Palette },
                          { type: 'emoji' as IdentifierType, label: 'Icono', Icon: Smiley },
                          { type: 'photo' as IdentifierType, label: 'Foto', Icon: Camera },
                        ]).map((opt) => (
                          <motion.div key={opt.type} variants={buttonHover} initial="rest" whileHover="hover">
                            <button
                              onClick={() => setIdentifierType(opt.type)}
                              className={`w-full flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl text-sm font-medium transition-all ${
                                identifierType === opt.type
                                  ? 'bg-primary/10 text-primary ring-2 ring-primary/20'
                                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                              }`}
                            >
                              <opt.Icon className="w-5 h-5" />
                              <span>{opt.label}</span>
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {identifierType === 'color' && (
                      <div className="space-y-2">
                        <Label>Color del Grupo</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={groupColor}
                            onChange={(e) => setGroupColor(e.target.value)}
                            className="w-12 h-10 rounded-xl cursor-pointer"
                          />
                          <span className="text-sm text-muted-foreground font-mono">{groupColor}</span>
                        </div>
                      </div>
                    )}

                    {identifierType === 'emoji' && (
                      <div className="space-y-2">
                        <Label>Icono del Grupo</Label>
                        <Input
                          value={groupEmoji}
                          onChange={(e) => setGroupEmoji(e.target.value)}
                          placeholder="Nombre del icono (ej: Bank)"
                          className="bg-secondary rounded-2xl focus:ring-2 focus:ring-primary/30 focus:bg-white"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {ICON_PRESETS.map((iconName) => (
                            <motion.div key={iconName} variants={buttonHover} initial="rest" whileHover="hover">
                              <button
                                onClick={() => setGroupEmoji(iconName)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                  groupEmoji === iconName ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-secondary'
                                }`}
                                title={iconName}
                              >
                                <PhosphorIcon name={iconName} className="w-5 h-5" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {identifierType === 'photo' && (
                      <div className="space-y-2">
                        <Label>Foto de Portada</Label>
                        <label className="flex flex-col items-center justify-center w-full h-32 bg-secondary rounded-2xl cursor-pointer hover:bg-primary/5 transition-all">
                          {groupPhotoPreview ? (
                            <img src={groupPhotoPreview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Image className="w-8 h-8 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Seleccionar imagen</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Validador (límite de tarjetas)</Label>
                      <Input
                        type="number"
                        value={groupValidator}
                        onChange={(e) => setGroupValidator(Number(e.target.value))}
                        min={1}
                        className="bg-secondary rounded-2xl focus:ring-2 focus:ring-primary/30 focus:bg-white"
                      />
                    </div>

                    <div className="bg-secondary rounded-2xl p-4">
                      <p className="text-xs text-muted-foreground mb-2 uppercase font-semibold tracking-wide">Vista Previa</p>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
                          style={{ backgroundColor: identifierType === 'color' ? groupColor : groupColor + '20' }}
                        >
                          {identifierType === 'emoji' && <PhosphorIcon name={groupEmoji} className="w-6 h-6" />}
                          {identifierType === 'photo' && groupPhotoPreview && (
                            <img src={groupPhotoPreview} alt="" className="w-full h-full object-cover" />
                          )}
                          {identifierType === 'color' && <span className="text-white text-xs font-bold">COLOR</span>}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{groupName || 'Nombre del grupo'}</p>
                          <p className="text-xs text-muted-foreground/60">0 / {groupValidator} tarjetas</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={resetGroupForm} className="flex-1">
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveGroup} disabled={saving} className="flex-1">
                      {saving ? 'Guardando...' : editingGroup ? 'Guardar' : 'Crear'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Groups Tree View */}
              <div className="bg-white rounded-3xl overflow-hidden p-5">
                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide mb-4">Estructura de Grupos</p>
                <div className="space-y-2">
                  {treeItems.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm">No hay grupos creados</div>
                  )}
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {treeItems.map(({ group, depth }) => {
                      const cardCount = cards.filter((c) => c.groupId === group.id).length;
                      const progress = Math.min((cardCount / group.validator) * 100, 100);
                      return (
                        <motion.div
                          key={group.id}
                          variants={staggerItem}
                          className="px-4 py-3 hover:bg-secondary rounded-2xl transition-colors"
                          style={{ paddingLeft: `${16 + depth * 32}px` }}
                        >
                          {depth > 0 && (
                            <div className="flex items-center gap-2 mb-1.5" style={{ marginLeft: '-20px' }}>
                              <div className="w-4 h-px bg-muted-foreground/20" />
                              <CaretDown className="w-3 h-3 text-muted-foreground/60 rotate-[-90deg]" />
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            {renderGroupIdentifier(group, 'md')}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground truncate text-sm">{group.name}</span>
                                <Badge variant="secondary" className="text-[10px] uppercase shrink-0 px-1.5 py-0.5">
                                  {group.identifierType}
                                </Badge>
                                {depth > 0 && (
                                  <Badge variant="default" className="text-[10px] shrink-0 px-1.5 py-0.5">
                                    sub
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex-1 max-w-[120px]" style={{ '--group-clr': group.color } as React.CSSProperties}>
                                  <Progress
                                    value={progress}
                                    className="h-1.5"
                                    indicatorClassName="transition-all duration-500 !bg-[color:var(--group-clr)]"
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground/60 shrink-0">{cardCount}/{group.validator}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <motion.div variants={buttonHover} initial="rest" whileHover="hover">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleAddSubgroup(group.id)}
                                  title="Agregar subgrupo"
                                  className="text-muted-foreground/60 hover:text-green-600 hover:bg-green-50"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </motion.div>
                              <motion.div variants={buttonHover} initial="rest" whileHover="hover">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleEditGroup(group)}
                                  title="Editar"
                                  className="text-muted-foreground/60 hover:text-primary hover:bg-primary/5"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </motion.div>
                              <motion.div variants={buttonHover} initial="rest" whileHover="hover">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDeleteGroup(group.id)}
                                  title="Eliminar"
                                  className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5"
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="files">
            <motion.div
              key="files-tab"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h2 className="text-lg font-bold text-foreground">Archivos Subidos</h2>
                <AnimatePresence>
                  {selectedCards.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-sm text-muted-foreground">{selectedCards.size} seleccionada(s)</span>
                      <motion.div variants={buttonHover} initial="rest" whileHover="hover">
                        <Button
                          size="sm"
                          onClick={() => setShowMoveModal(true)}
                          className="gap-1.5"
                        >
                          <ArrowsLeftRight className="w-3.5 h-3.5" />
                          Mover a grupo
                        </Button>
                      </motion.div>
                      <motion.div variants={buttonHover} initial="rest" whileHover="hover">
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => setShowTrashConfirm(true)}
                          className="gap-1.5"
                        >
                          <Trash className="w-3.5 h-3.5" />
                          Enviar a Papelera
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={selectedCards.size === cards.length && cards.length > 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleAllCards}
                >
                  {selectedCards.size === cards.length && cards.length > 0 ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </Button>
              </div>

              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {cards.map((card) => {
                  const group = groups.find((g) => g.id === card.groupId);
                  return (
                    <motion.div
                      key={card.id}
                      variants={staggerItem}
                      whileHover="hover"
                      initial="rest"
                      animate="rest"
                       className={`relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all ${
                        selectedCards.has(card.id) ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      onClick={() => toggleCardSelection(card.id)}
                    >
                      <motion.div variants={cardHover}>
                        <div className="aspect-[3/4] relative">
                          <img
                            src={card.imageUrl}
                            alt={card.groupName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute top-2 left-2">
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                                selectedCards.has(card.id)
                                  ? 'bg-primary'
                                  : 'bg-white/80'
                              }`}
                            >
                              {selectedCards.has(card.id) && (
                                <Check className="w-3 h-3 text-white" weight="bold" />
                              )}
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-white text-xs font-bold truncate">{card.groupName}</p>
                            <p className="text-white/70 text-[10px]">{card.date}</p>
                          </div>
                        </div>
                        <div className="px-3 py-2 flex items-center gap-1.5">
                          {group && renderGroupIdentifier(group, 'sm')}
                          <span className="text-[10px] font-semibold text-muted-foreground truncate">{card.groupName}</span>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Move Modal */}
      <Dialog open={showMoveModal} onOpenChange={setShowMoveModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mover {selectedCards.size} tarjeta(s) a...</DialogTitle>
            <DialogDescription>
              Selecciona el grupo destino para las tarjetas seleccionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {treeMoveItems.map(({ group, depth }) => {
              const cardCount = cards.filter((c) => c.groupId === group.id).length;
              return (
                <motion.div key={group.id} variants={buttonHover} initial="rest" whileHover="hover">
                  <button
                    onClick={() => handleMoveCards(group.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-secondary transition-all text-left"
                    style={{ paddingLeft: `${16 + depth * 24}px` }}
                  >
                    {renderGroupIdentifier(group, 'sm')}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground text-sm">{group.name}</span>
                      <p className="text-[10px] text-muted-foreground/60">{cardCount} tarjetas</p>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send to Trash Confirmation */}
      <Dialog open={showTrashConfirm} onOpenChange={setShowTrashConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center shrink-0">
                <Warning className="w-6 h-6 text-warning" />
              </div>
              <div>
                <DialogTitle>Enviar a Papelera</DialogTitle>
                <DialogDescription>Puedes restaurarlo después</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="bg-warning/5 rounded-2xl p-4">
            <p className="text-sm text-foreground">
              ¿Estás seguro de enviar <strong>{selectedCards.size} registro(s)</strong> a la papelera?
              Podrás restaurarlos o eliminarlos permanentemente desde el módulo de Papelera.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowTrashConfirm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button variant="warning" onClick={handleSendToTrash} className="flex-1">
              Enviar a Papelera
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Group Confirmation Modal */}
      <AnimatePresence>
        {groupToDelete && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setGroupToDelete(null)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl p-6 space-y-5"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Warning className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Eliminar Grupo</h2>
                  <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="bg-destructive/5 rounded-2xl p-4 space-y-3">
                <p className="text-sm text-foreground">
                  Vas a eliminar <strong>"{groupToDelete.name}"</strong>
                  {(() => {
                    const children = groups.filter((g) => g.parentId === groupToDelete.id);
                    return children.length > 0
                      ? ` y sus ${children.length} subgrupo(s)`
                      : '';
                  })()}
                  .
                </p>
                <p className="text-sm text-foreground/70">
                  Para confirmar, escribe el nombre del grupo:
                </p>
              </div>

              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={groupToDelete.name}
                className="bg-secondary rounded-2xl focus:ring-2 focus:ring-destructive/30 focus:bg-white"
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setGroupToDelete(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  disabled={deleteConfirmText !== groupToDelete.name}
                  onClick={confirmDeleteGroup}
                >
                  <Trash className="w-4 h-4" />
                  Eliminar
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
