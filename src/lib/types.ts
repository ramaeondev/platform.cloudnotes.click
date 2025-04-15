export interface Category {
  id: string;
  name: string;
  color: string; // Hex color string like #FFFFFF
  isSystem: boolean;
  sequence: number;
  notesCount?: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  isSystem?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  categoryId: string | null;
  folderId: string | null;
  isArchived: boolean;
  isDeleted: boolean;
  tags: string[];
}

export interface CalendarDay {
  date: Date;
  notesCount: number;
  categories: {
    [categoryId: string]: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ProfileModel {
  id: string;
  name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  is_initial_setup_completed: boolean | null;
  updated_at: string | null;
  created_at: string | null;
  newsletter_subscribed: boolean;
}
