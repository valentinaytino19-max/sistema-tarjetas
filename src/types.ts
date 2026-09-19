export type IdentifierType = 'photo' | 'color' | 'emoji';

export interface Group {
  id: string;
  name: string;
  color: string;
  validator: number;
  identifierType: IdentifierType;
  emoji?: string;
  photoUrl?: string;
  parentId?: string;
}

export interface Card {
  id: string;
  imageUrl: string;
  date: string;
  groupId: string;
  groupName: string;
  deletedAt?: string;
}
