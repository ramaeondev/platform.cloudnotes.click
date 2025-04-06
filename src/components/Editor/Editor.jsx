
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const Editor = ({ note, categories }) => {
  const [isPreview, setIsPreview] = useState(true);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  
  useEffect(() => {
    if (note) {
      setEditedTitle(note.title);
      setEditedContent(note.content);
    } else {
      setEditedTitle('');
      setEditedContent('');
    }
  }, [note]);
  
  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || null;
  };
  
  // Simple markdown rendering
  const renderMarkdown = (markdown) => {
    if (!markdown) return '';
    
    let html = markdown
      // Headers
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      // Bold and Italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^\s*\n\* (.*)/gm, '<ul>\n<li>$1</li>\n</ul>')
      .replace(/^\s*\n\d+\. (.*)/gm, '<ol>\n<li>$1</li>\n</ol>')
      // Fix lists
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/<\/ol>\s*<ol>/g, '')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
      // Code blocks
      .replace(/```([^`]+)```/g, '<pre class="font-mono bg-muted p-3 rounded mb-4 overflow-x-auto">$1</pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="font-mono bg-muted px-1 py-0.5 rounded">$1</code>')
      // Blockquotes
      .replace(/^\> (.*$)/gm, '<blockquote class="pl-4 border-l-4 border-muted italic my-4">$1</blockquote>')
      // Paragraphs
      .replace(/^\s*(\n)?(.+)/gm, function(m) {
        return /^\s*<(\/)?(h|ul|ol|li|blockquote|pre|code)/.test(m) ? m : '<p class="mb-4">' + m + '</p>';
      })
      // Remove empty paragraphs
      .replace(/<p>\s*<\/p>/g, '');
    
    return html;
  };
  
  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text mb-4 opacity-30">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" x2="8" y1="13" y2="13"/>
          <line x1="16" x2="8" y1="17" y2="17"/>
          <line x1="10" x2="8" y1="9" y2="9"/>
        </svg>
        <p className="text-center text-lg font-medium mb-2">No note selected</p>
        <p className="text-center">
          Select a note from the list or create a new one
        </p>
      </div>
    );
  }
  
  const category = getCategoryById(note.categoryId);
  const updatedDate = new Date(note.updatedAt);

  return (
    <div className="flex flex-col h-full">
      {/* Note Header */}
      <div className="p-4 border-b">
        <input
          type="text"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          className={`w-full font-semibold text-xl bg-transparent outline-none ${isPreview ? 'border-none' : 'border border-input rounded px-2'}`}
          readOnly={isPreview}
        />
        <div className="flex items-center space-x-4 mt-2">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar text-muted-foreground">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
            <span className="text-sm text-muted-foreground">
              {format(updatedDate, 'MMM d, yyyy')}
            </span>
          </div>
          
          {category && (
            <div className={`note-category note-category-${category.color}`}>
              {category.name}
            </div>
          )}
          
          <div className="ml-auto">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="p-1 rounded hover:bg-muted"
            >
              {isPreview ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="m15 5 4 4"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Note Editor/Preview */}
      <div className="flex-1 overflow-y-auto p-4">
        {isPreview ? (
          <div 
            className="markdown-preview prose"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
          />
        ) : (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-2 border border-input rounded resize-none font-mono text-base focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Start writing your note in Markdown..."
          />
        )}
      </div>
      
      {/* Note Footer */}
      <div className="p-4 border-t flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag text-muted-foreground">
            <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>
            <circle cx="7.5" cy="7.5" r="1"/>
          </svg>
          <div className="flex flex-wrap gap-1">
            {note.tags.map(tag => (
              <span 
                key={tag} 
                className="px-1.5 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
        
        <div className="ml-auto flex space-x-2">
          <button className="p-1.5 rounded hover:bg-muted" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" x2="10" y1="11" y2="17"/>
              <line x1="14" x2="14" y1="11" y2="17"/>
            </svg>
          </button>
          <button className="p-1.5 rounded hover:bg-muted" title="Archive">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-archive">
              <rect width="20" height="5" x="2" y="3" rx="1"/>
              <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/>
              <path d="M10 12h4"/>
            </svg>
          </button>
          <button className="p-1.5 rounded hover:bg-muted" title="Share">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" x2="12" y1="2" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;
