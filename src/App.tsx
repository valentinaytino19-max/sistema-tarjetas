import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import FrontendView from './pages/FrontendView';
import BackOfficeView from './pages/BackOfficeView';
import TrashView from './pages/TrashView';
import type { Group, Card as CardType } from './types';
import { fetchCards, softDeleteCards, restoreCard, permanentDeleteCards, createCards, moveCards as moveCardsService } from './services/cards';
import { fetchGroups } from './services/groups';
import { uploadToR2, deleteMultipleFromR2 } from './lib/r2';
import { useToast } from './components/ui/toast';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<'frontend' | 'backoffice' | 'trash'>('frontend');
  const [groups, setGroups] = useState<Group[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fetchedCards, fetchedGroups] = await Promise.all([fetchCards(), fetchGroups()]);
      setCards(fetchedCards);
      setGroups(fetchedGroups);
    } catch (err) {
      console.error('Failed to load data from Supabase:', err);
      toast('error', 'Error al cargar datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const trashCards = cards.filter((c) => c.deletedAt);
  const activeCards = cards.filter((c) => !c.deletedAt);

  const handleSoftDelete = async (cardIds: string[]) => {
    try {
      await softDeleteCards(cardIds);
      const now = new Date().toISOString();
      setCards((prev) =>
        prev.map((c) => (cardIds.includes(c.id) ? { ...c, deletedAt: now } : c))
      );
      toast('success', 'Enviado a la papelera');
    } catch (err) {
      console.error('Failed to soft delete cards:', err);
      toast('error', 'Error al eliminar. Intenta de nuevo.');
    }
  };

  const handleRestore = async (cardId: string) => {
    try {
      await restoreCard(cardId);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, deletedAt: undefined } : c)));
      toast('success', 'Tarjeta restaurada');
    } catch (err) {
      console.error('Failed to restore card:', err);
      toast('error', 'Error al restaurar. Intenta de nuevo.');
    }
  };

  const handlePermanentDelete = async (cardIds: string[]) => {
    try {
      await permanentDeleteCards(cardIds);
      setCards((prev) => prev.filter((c) => !cardIds.includes(c.id)));
      toast('success', `${cardIds.length} registro(s) eliminado(s) permanentemente`);
    } catch (err) {
      console.error('Failed to permanently delete cards:', err);
      toast('error', 'Error al eliminar permanentemente.');
    }
  };

  const handleEmptyTrash = async () => {
    const trashIds = cards.filter((c) => c.deletedAt).map((c) => c.id);
    if (trashIds.length === 0) return;
    try {
      await permanentDeleteCards(trashIds);
      setCards((prev) => prev.filter((c) => !c.deletedAt));
      toast('success', 'Papelera vaciada');
    } catch (err) {
      console.error('Failed to empty trash:', err);
      toast('error', 'Error al vaciar la papelera.');
    }
  };

  const handleUploadCards = async (files: File[], groupId: string, groupName: string) => {
    if (isUploading) return;
    setIsUploading(true);

    const group = groups.find((g) => g.id === groupId);
    const currentCount = cards.filter((c) => c.groupId === groupId && !c.deletedAt).length;
    const maxCards = group?.validator ?? Infinity;
    const availableSlots = maxCards - currentCount;

    if (availableSlots <= 0) {
      toast('warning', `El grupo "${groupName}" alcanzó el límite de ${maxCards} tarjetas`);
      setIsUploading(false);
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast('warning', `Solo quedan ${availableSlots} espacio(s). ${files.length - availableSlots} imagen(es) omitida(s)`);
    }

    const uploadedUrls: string[] = [];
    const newCards: Omit<CardType, 'id'>[] = [];
    let failCount = 0;

    for (const file of filesToUpload) {
      try {
        const imageUrl = await uploadToR2(file);
        uploadedUrls.push(imageUrl);
        newCards.push({
          imageUrl,
          date: new Date().toISOString(),
          groupId,
          groupName,
        });
      } catch (err) {
        console.error('Failed to upload image to R2:', err);
        failCount++;
      }
    }

    if (newCards.length > 0) {
      try {
        const created = await createCards(newCards);
        setCards((prev) => [...created, ...prev]);
        const msg = failCount > 0
          ? `${newCards.length} subida(s), ${failCount} fallida(s)`
          : `${newCards.length} imagen(es) subida(s)`;
        toast(failCount > 0 ? 'warning' : 'success', msg);
      } catch (err) {
        console.error('Failed to save cards to Supabase:', err);
        await deleteMultipleFromR2(uploadedUrls);
        toast('error', 'Error al guardar. Imágenes eliminadas de R2.');
      }
    } else if (failCount > 0) {
      toast('error', `Todas las ${failCount} imagen(es) fallaron al subir`);
    }

    setIsUploading(false);
  };

  const handleMoveCards = async (cardIds: string[], targetGroupId: string, targetGroupName: string) => {
    try {
      await moveCardsService(cardIds, targetGroupId, targetGroupName);
      setCards((prev) =>
        prev.map((c) =>
          cardIds.includes(c.id) ? { ...c, groupId: targetGroupId, groupName: targetGroupName } : c
        )
      );
      toast('success', `${cardIds.length} tarjeta(s) movida(s) a ${targetGroupName}`);
    } catch (err) {
      console.error('Failed to move cards:', err);
      toast('error', 'Error al mover tarjetas.');
    }
  };

  const handleGroupsChange = (updatedGroups: Group[]) => {
    setGroups(updatedGroups);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView} trashCount={trashCards.length}>
      {currentView === 'frontend' && (
        <FrontendView
          cards={activeCards}
          groups={groups}
          onSoftDelete={handleSoftDelete}
          onUpload={handleUploadCards}
          isUploading={isUploading}
        />
      )}
      {currentView === 'backoffice' && (
        <BackOfficeView
          cards={activeCards}
          groups={groups}
          onSoftDelete={handleSoftDelete}
          onGroupsChange={handleGroupsChange}
          onMoveCards={handleMoveCards}
        />
      )}
      {currentView === 'trash' && (
        <TrashView
          cards={cards}
          groups={groups}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onEmptyTrash={handleEmptyTrash}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
