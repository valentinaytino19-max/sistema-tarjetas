import { supabase } from '../lib/supabase';
import type { Card } from '../types';

function mapRow(row: Record<string, unknown>): Card {
  return {
    id: row.id as string,
    imageUrl: row.image_url as string,
    date: row.date as string,
    groupId: row.group_id as string,
    groupName: row.group_name as string,
    deletedAt: (row.deleted_at as string) || undefined,
  };
}

export async function fetchCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function createCard(card: Omit<Card, 'id'>): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .insert({
      image_url: card.imageUrl,
      date: card.date,
      group_id: card.groupId,
      group_name: card.groupName,
    })
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function createCards(cards: Omit<Card, 'id'>[]): Promise<Card[]> {
  const rows = cards.map((c) => ({
    image_url: c.imageUrl,
    date: c.date,
    group_id: c.groupId,
    group_name: c.groupName,
  }));

  const { data, error } = await supabase
    .from('cards')
    .insert(rows)
    .select();

  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function softDeleteCards(cardIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', cardIds);

  if (error) throw error;
}

export async function restoreCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ deleted_at: null })
    .eq('id', cardId);

  if (error) throw error;
}

export async function permanentDeleteCards(cardIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .delete()
    .in('id', cardIds);

  if (error) throw error;
}

export async function moveCards(cardIds: string[], targetGroupId: string, targetGroupName: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ group_id: targetGroupId, group_name: targetGroupName })
    .in('id', cardIds);

  if (error) throw error;
}
