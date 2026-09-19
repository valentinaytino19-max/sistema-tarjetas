import { supabase } from '../lib/supabase';
import type { Group } from '../types';

function mapRow(row: Record<string, unknown>): Group {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    validator: row.validator as number,
    identifierType: row.identifier_type as Group['identifierType'],
    emoji: (row.emoji as string) || undefined,
    photoUrl: (row.photo_url as string) || undefined,
    parentId: (row.parent_id as string) || undefined,
  };
}

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function createGroup(group: Omit<Group, 'id'>): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: group.name,
      color: group.color,
      validator: group.validator,
      identifier_type: group.identifierType,
      emoji: group.emoji || null,
      photo_url: group.photoUrl || null,
      parent_id: group.parentId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function updateGroup(id: string, group: Partial<Group>): Promise<Group> {
  const update: Record<string, unknown> = {};
  if (group.name !== undefined) update.name = group.name;
  if (group.color !== undefined) update.color = group.color;
  if (group.validator !== undefined) update.validator = group.validator;
  if (group.identifierType !== undefined) update.identifier_type = group.identifierType;
  if (group.emoji !== undefined) update.emoji = group.emoji || null;
  if (group.photoUrl !== undefined) update.photo_url = group.photoUrl || null;
  if (group.parentId !== undefined) update.parent_id = group.parentId || null;

  const { data, error } = await supabase
    .from('groups')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteGroups(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .in('id', ids);

  if (error) throw error;
}
