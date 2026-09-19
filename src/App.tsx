import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import FrontendView from './pages/FrontendView';
import BackOfficeView from './pages/BackOfficeView';
import TrashView from './pages/TrashView';
import type { Group, Card as CardType } from './types';
import { fetchCards, softDeleteCards, restoreCard, permanentDeleteCards, createCards } from './services/cards';
import { fetchGroups } from './services/groups';
import { uploadToR2 } from './lib/r2';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<'frontend' | 'backoffice' | 'trash'>('frontend');
  const [groups, setGroups] = useState<Group[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [fetchedCards, fetchedGroups] = await Promise.all([fetchCards(), fetchGroups()]);
      setCards(fetchedCards);
      setGroups(fetchedGroups);
    } catch (err) {
      console.error('Failed to load data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
    } catch (err) {
      console.error('Failed to soft delete cards:', err);
    }
  };

  const handleRestore = async (cardId: string) => {
    try {
      await restoreCard(cardId);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, deletedAt: undefined } : c)));
    } catch (err) {
      console.error('Failed to restore card:', err);
    }
  };

  const handlePermanentDelete = async (cardIds: string[]) => {
    try {
      await permanentDeleteCards(cardIds);
      setCards((prev) => prev.filter((c) => !cardIds.includes(c.id)));
    } catch (err) {
      console.error('Failed to permanently delete cards:', err);
    }
  };

  const handleEmptyTrash = async () => {
    const trashIds = cards.filter((c) => c.deletedAt).map((c) => c.id);
    if (trashIds.length === 0) return;
    try {
      await permanentDeleteCards(trashIds);
      setCards((prev) => prev.filter((c) => !c.deletedAt));
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  const handleUploadCards = async (files: File[], groupId: string, groupName: string) => {
    const newCards: Omit<CardType, 'id'>[] = [];
    for (const file of files) {
      try {
        const imageUrl = await uploadToR2(file);
        newCards.push({
          imageUrl,
          date: new Date().toISOString().split('T')[0],
          groupId,
          groupName,
        });
      } catch (err) {
        console.error('Failed to upload image to R2:', err);
      }
    }
    if (newCards.length > 0) {
      try {
        const created = await createCards(newCards);
        setCards((prev) => [...created, ...prev]);
      } catch (err) {
        console.error('Failed to save cards to Supabase:', err);
      }
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
        />
      )}
      {currentView === 'backoffice' && (
        <BackOfficeView
          cards={activeCards}
          groups={groups}
          onSoftDelete={handleSoftDelete}
          onGroupsChange={handleGroupsChange}
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
