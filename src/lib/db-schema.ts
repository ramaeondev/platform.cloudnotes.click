
/**
 * CloudNotes Database Schema
 * 
 * This file contains the schema definition for the Supabase database
 * tables that will be created for the CloudNotes application.
 * 
 * Table Descriptions:
 * 
 * 1. users - Store user account information
 * 2. folders - Store folders for organizing notes
 * 3. categories - Store note categories
 * 4. notes - Store user notes with rich text content
 * 5. note_tags - Junction table for many-to-many relationship between notes and tags
 * 6. tags - Store tags for notes
 * 7. shared_notes - Store information about notes shared with other users
 */

export const dbSchema = {
  tables: [
    {
      name: 'users',
      description: 'Stores user profile information',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true, references: 'auth.users.id' },
        { name: 'email', type: 'text', unique: true, notNull: true },
        { name: 'name', type: 'text', notNull: true },
        { name: 'avatar_url', type: 'text' },
        { name: 'created_at', type: 'timestamp with time zone', default: 'now()', notNull: true },
        { name: 'updated_at', type: 'timestamp with time zone', default: 'now()', notNull: true }
      ],
      rls: {
        select: 'authenticated users can select their own data',
        insert: 'authenticated users can insert their own data',
        update: 'authenticated users can update their own data',
        delete: 'disabled'
      }
    },
    {
      name: 'folders',
      description: 'Stores note folders for organization',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
        { name: 'name', type: 'text', notNull: true },
        { name: 'parent_id', type: 'uuid', references: 'folders.id' },
        { name: 'user_id', type: 'uuid', notNull: true, references: 'users.id' },
        { name: 'created_at', type: 'timestamp with time zone', default: 'now()', notNull: true },
        { name: 'updated_at', type: 'timestamp with time zone', default: 'now()', notNull: true }
      ],
      rls: {
        select: 'authenticated users can select their own folders',
        insert: 'authenticated users can insert their own folders',
        update: 'authenticated users can update their own folders',
        delete: 'authenticated users can delete their own folders'
      }
    },
    {
      name: 'categories',
      description: 'Stores note categories with color coding',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
        { name: 'name', type: 'text', notNull: true },
        { name: 'color', type: 'text', notNull: true },
        { name: 'user_id', type: 'uuid', notNull: true, references: 'users.id' },
        { name: 'created_at', type: 'timestamp with time zone', default: 'now()', notNull: true },
        { name: 'updated_at', type: 'timestamp with time zone', default: 'now()', notNull: true }
      ],
      rls: {
        select: 'authenticated users can select their own categories',
        insert: 'authenticated users can insert their own categories',
        update: 'authenticated users can update their own categories',
        delete: 'authenticated users can delete their own categories'
      }
    },
    {
      name: 'notes',
      description: 'Stores user notes with markdown content',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
        { name: 'title', type: 'text', notNull: true },
        { name: 'content', type: 'text', notNull: true },
        { name: 'folder_id', type: 'uuid', references: 'folders.id' },
        { name: 'category_id', type: 'uuid', references: 'categories.id' },
        { name: 'user_id', type: 'uuid', notNull: true, references: 'users.id' },
        { name: 'is_archived', type: 'boolean', default: false, notNull: true },
        { name: 'is_deleted', type: 'boolean', default: false, notNull: true },
        { name: 'created_at', type: 'timestamp with time zone', default: 'now()', notNull: true },
        { name: 'updated_at', type: 'timestamp with time zone', default: 'now()', notNull: true }
      ],
      rls: {
        select: 'authenticated users can select their own notes',
        insert: 'authenticated users can insert their own notes',
        update: 'authenticated users can update their own notes',
        delete: 'authenticated users can delete their own notes'
      }
    },
    {
      name: 'tags',
      description: 'Stores tags that can be applied to notes',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
        { name: 'name', type: 'text', notNull: true },
        { name: 'user_id', type: 'uuid', notNull: true, references: 'users.id' },
        { name: 'created_at', type: 'timestamp with time zone', default: 'now()', notNull: true }
      ],
      rls: {
        select: 'authenticated users can select their own tags',
        insert: 'authenticated users can insert their own tags',
        update: 'authenticated users can update their own tags',
        delete: 'authenticated users can delete their own tags'
      }
    },
    {
      name: 'note_tags',
      description: 'Junction table for many-to-many relationship between notes and tags',
      columns: [
        { name: 'note_id', type: 'uuid', notNull: true, references: 'notes.id' },
        { name: 'tag_id', type: 'uuid', notNull: true, references: 'tags.id' }
      ],
      primaryKey: ['note_id', 'tag_id'],
      rls: {
        select: 'authenticated users can select tags for their own notes',
        insert: 'authenticated users can insert tags for their own notes',
        update: 'disabled',
        delete: 'authenticated users can delete tags from their own notes'
      }
    },
    {
      name: 'shared_notes',
      description: 'Stores information about notes shared with other users or publicly',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
        { name: 'note_id', type: 'uuid', notNull: true, references: 'notes.id' },
        { name: 'shared_by', type: 'uuid', notNull: true, references: 'users.id' },
        { name: 'shared_with', type: 'uuid', references: 'users.id' },
        { name: 'access_code', type: 'text', unique: true },
        { name: 'is_public', type: 'boolean', default: false, notNull: true },
        { name: 'can_edit', type: 'boolean', default: false, notNull: true },
        { name: 'created_at', type: 'timestamp with time zone', default: 'now()', notNull: true },
        { name: 'expires_at', type: 'timestamp with time zone' }
      ],
      rls: {
        select: 'authenticated users can select sharing info for their own notes',
        insert: 'authenticated users can share their own notes',
        update: 'authenticated users can update sharing info for their own notes',
        delete: 'authenticated users can remove sharing from their own notes'
      }
    },
    {
      name: 'note_attachments',
      description: 'Stores file attachments for notes',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true, default: 'uuid_generate_v4()' },
        { name: 'note_id', type: 'uuid', notNull: true, references: 'notes.id' },
        { name: 'file_name', type: 'text', notNull: true },
        { name: 'file_type', type: 'text', notNull: true },
        { name: 'file_size', type: 'integer', notNull: true },
        { name: 'storage_path', type: 'text', notNull: true },
        { name: 'created_at', type: 'timestamp with time zone', default: 'now()', notNull: true },
        { name: 'user_id', type: 'uuid', notNull: true, references: 'users.id' }
      ],
      rls: {
        select: 'authenticated users can select attachments for their own notes',
        insert: 'authenticated users can add attachments to their own notes',
        update: 'authenticated users can update attachments for their own notes',
        delete: 'authenticated users can delete attachments from their own notes'
      }
    }
  ],
  
  functions: [
    {
      name: 'get_user_notes',
      description: 'Function to get all notes for a user',
      parameters: ['user_uuid UUID'],
      returns: 'TABLE(id UUID, title TEXT, content TEXT, folder_id UUID, folder_name TEXT, category_id UUID, category_name TEXT, category_color TEXT, is_archived BOOLEAN, is_deleted BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)',
      language: 'plpgsql'
    },
    {
      name: 'search_notes',
      description: 'Function to search through notes by title and content',
      parameters: ['search_term TEXT', 'user_uuid UUID'],
      returns: 'TABLE(id UUID, title TEXT, content TEXT, similarity FLOAT)',
      language: 'plpgsql'
    }
  ],
  
  triggers: [
    {
      name: 'set_updated_at',
      description: 'Trigger to automatically set updated_at timestamp',
      tables: ['users', 'folders', 'categories', 'notes'],
      when: 'BEFORE UPDATE',
      function: 'set_updated_at_timestamp'
    }
  ],
  
  policies: [
    {
      table: 'users',
      name: 'users_select_own',
      using: 'auth.uid() = id',
      operation: 'SELECT'
    },
    {
      table: 'folders',
      name: 'folders_select_own',
      using: 'auth.uid() = user_id',
      operation: 'SELECT'
    },
    {
      table: 'notes',
      name: 'notes_select_own',
      using: 'auth.uid() = user_id OR id IN (SELECT note_id FROM shared_notes WHERE shared_with = auth.uid())',
      operation: 'SELECT'
    },
    {
      table: 'notes',
      name: 'notes_select_public',
      using: 'id IN (SELECT note_id FROM shared_notes WHERE is_public = TRUE)',
      operation: 'SELECT'
    }
  ]
};
