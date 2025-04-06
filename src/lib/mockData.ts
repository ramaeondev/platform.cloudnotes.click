
import { Category, Folder, Note } from './types';

export const mockCategories: Category[] = [
  { id: 'cat1', name: 'Work', color: 'blue' },
  { id: 'cat2', name: 'Personal', color: 'green' },
  { id: 'cat3', name: 'Ideas', color: 'purple' },
  { id: 'cat4', name: 'To-Do', color: 'red' },
  { id: 'cat5', name: 'Learning', color: 'yellow' },
  { id: 'cat6', name: 'Projects', color: 'pink' },
];

export const mockFolders: Folder[] = [
  { id: 'folder1', name: 'Work Notes', parentId: null },
  { id: 'folder2', name: 'Personal', parentId: null },
  { id: 'folder3', name: 'Projects', parentId: null },
  { id: 'folder4', name: 'Frontend', parentId: 'folder3' },
  { id: 'folder5', name: 'Backend', parentId: 'folder3' },
  { id: 'folder6', name: 'Archive', parentId: null },
];

export const mockNotes: Note[] = [
  {
    id: 'note1',
    title: 'Getting Started with CloudNotes',
    content: `# Welcome to CloudNotes!

This is your first note. CloudNotes supports full **Markdown** syntax.

## Features

- Create and organize notes in folders
- Add categories and tags
- Full markdown support
- Calendar integration

### Code Example

\`\`\`javascript
function greet() {
  console.log("Welcome to CloudNotes!");
}
\`\`\`

> Cloud Notes makes note-taking simple and powerful.

`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categoryId: 'cat2',
    folderId: 'folder2',
    isArchived: false,
    isDeleted: false,
    tags: ['welcome', 'getting-started'],
  },
  {
    id: 'note2',
    title: 'Project Ideas',
    content: `# Project Ideas for Q2

1. Mobile app redesign
2. Customer dashboard improvements
3. API documentation update

## Design Ideas

- Minimalist interface
- Dark mode support
- Improved accessibility

### Timeline

- Research: 1 week
- Prototyping: 2 weeks
- Development: 4 weeks
- Testing: 1 week
- Launch: 1 week
`,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    categoryId: 'cat3',
    folderId: 'folder1',
    isArchived: false,
    isDeleted: false,
    tags: ['projects', 'ideas', 'planning'],
  },
  {
    id: 'note3',
    title: 'React Hooks Cheatsheet',
    content: `# React Hooks Cheatsheet

## useState

\`\`\`jsx
const [state, setState] = useState(initialState);
\`\`\`

## useEffect

\`\`\`jsx
useEffect(() => {
  // Side effect code
  
  return () => {
    // Cleanup code
  };
}, [dependencies]);
\`\`\`

## useContext

\`\`\`jsx
const value = useContext(MyContext);
\`\`\`

## useReducer

\`\`\`jsx
const [state, dispatch] = useReducer(reducer, initialState);
\`\`\`

## useMemo

\`\`\`jsx
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
\`\`\`

## useCallback

\`\`\`jsx
const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
\`\`\`
`,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    categoryId: 'cat5',
    folderId: 'folder4',
    isArchived: false,
    isDeleted: false,
    tags: ['react', 'programming', 'cheatsheet'],
  },
  {
    id: 'note4',
    title: 'Meeting Notes: Product Review',
    content: `# Product Review Meeting - April 5, 2024

## Attendees

- John Smith (Product)
- Jane Doe (Design)
- Mark Johnson (Engineering)
- Sarah Williams (Marketing)

## Agenda

1. Q1 Performance Review
2. Feature Roadmap
3. Customer Feedback
4. AOB

## Discussion Points

### Q1 Performance
- Exceeded sales targets by 15%
- User engagement up by 23%
- Customer support tickets down 8%

### Roadmap
- Mobile app redesign (Q2)
- API improvements (Q2-Q3)
- New analytics dashboard (Q3)

### Customer Feedback
- Positive reception to new UI
- Request for better reporting features
- Some performance issues on older devices

## Action Items

- [ ] Sarah: Prepare marketing materials for Q2 features
- [ ] Mark: Investigate performance issues
- [ ] Jane: Complete mobile redesign mockups
- [ ] John: Update roadmap document

Next meeting scheduled for April 19, 2024
`,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
    categoryId: 'cat1',
    folderId: 'folder1',
    isArchived: false,
    isDeleted: false,
    tags: ['meeting', 'product', 'planning'],
  },
  {
    id: 'note5',
    title: 'Vacation Planning',
    content: `# Summer Vacation Ideas

## Destinations

1. **Greece**
   - Athens (3 days)
   - Santorini (4 days)
   - Mykonos (3 days)

2. **Japan**
   - Tokyo (5 days)
   - Kyoto (4 days)
   - Osaka (2 days)

3. **Italy**
   - Rome (4 days)
   - Florence (3 days)
   - Venice (2 days)
   - Amalfi Coast (3 days)

## Budget Breakdown

| Expense | Estimated Cost |
|---------|----------------|
| Flights | $1,200 |
| Accommodations | $1,800 |
| Food | $1,000 |
| Activities | $800 |
| Transportation | $500 |
| Miscellaneous | $300 |

**Total: $5,600**

## To-Do Before Trip

- [ ] Book flights
- [ ] Reserve accommodations
- [ ] Research local attractions
- [ ] Check visa requirements
- [ ] Purchase travel insurance
- [ ] Plan daily itinerary
`,
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    updatedAt: new Date(Date.now() - 345600000).toISOString(),
    categoryId: 'cat2',
    folderId: 'folder2',
    isArchived: false,
    isDeleted: false,
    tags: ['travel', 'planning', 'vacation'],
  },
  {
    id: 'note6',
    title: 'Database Schema Design',
    content: `# Database Schema for CloudNotes

## Users Table

\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

## Notes Table

\`\`\`sql
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  folder_id UUID REFERENCES folders(id),
  is_archived BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);
\`\`\`

## Folders Table

\`\`\`sql
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

## Categories Table

\`\`\`sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);
\`\`\`

## Tags Table

\`\`\`sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);
\`\`\`

## Note Tags Table

\`\`\`sql
CREATE TABLE note_tags (
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
\`\`\`

## Sharing Table

\`\`\`sql
CREATE TABLE note_shares (
  id UUID PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  share_link TEXT UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
\`\`\`
`,
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    updatedAt: new Date(Date.now() - 432000000).toISOString(),
    categoryId: 'cat6',
    folderId: 'folder5',
    isArchived: false,
    isDeleted: false,
    tags: ['database', 'schema', 'sql'],
  },
];

export const getCalendarData = () => {
  const today = new Date();
  const calendarData = [];
  
  // Generate 30 days of calendar data
  for (let i = -15; i < 15; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Randomly decide if this date has notes
    const notesCount = Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0;
    
    const categories: Record<string, number> = {};
    
    // Randomly assign categories to this date
    if (notesCount > 0) {
      const availableCategories = [...mockCategories];
      for (let j = 0; j < Math.min(notesCount, 3); j++) {
        const randomCategoryIndex = Math.floor(Math.random() * availableCategories.length);
        const category = availableCategories[randomCategoryIndex];
        categories[category.id] = Math.floor(Math.random() * 3) + 1;
        availableCategories.splice(randomCategoryIndex, 1);
      }
    }
    
    calendarData.push({
      date,
      notesCount,
      categories
    });
  }
  
  return calendarData;
};
