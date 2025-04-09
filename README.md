
# CloudNotes

CloudNotes is an open-source note-taking application built with modern web technologies. The application allows users to create, organize, and manage notes with a powerful Markdown editor, folder organization, and cloud integrations.

## Features

- **User Authentication**: Secure email/password authentication
- **Markdown Editor**: Rich text editing with Markdown support
- **Folder Organization**: Organize notes in a hierarchical folder structure
- **Categories & Tags**: Categorize and tag notes for better organization
- **Cloud Storage**: Automatic backup to Amazon S3
- **Cloud Integrations**: Connect to various cloud storage providers (coming soon)
- **Mobile Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Cloud Storage**: Amazon S3
- **Edge Functions**: Deno-based Supabase Edge Functions
- **State Management**: TanStack Query (React Query)
- **UI Components**: shadcn/ui

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account
- AWS S3 bucket (for cloud storage)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cloudnotes.git
cd cloudnotes
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
- Create a `.env` file based on `.env.example`
- Add your Supabase URL and anon key
- Add AWS credentials if using S3 features

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Project Structure

```
cloudnotes/
├── public/              # Static assets
├── src/                 # Source code
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and types
│   ├── pages/           # Page components
│   ├── services/        # Service modules
│   └── integrations/    # External integrations
├── supabase/            # Supabase configuration
│   ├── functions/       # Edge functions
│   └── migrations/      # Database migrations
└── ...
```

## Contributing

We're looking for passionate individuals to contribute to CloudNotes! Whether you're a developer, designer, or writer, there's a place for you.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas We Need Help

- Frontend developers (React, TypeScript)
- UI/UX designers
- Backend developers (PostgreSQL, Supabase)
- Documentation writers
- QA testers

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or feedback, please open an issue in the GitHub repository.

---

**CloudNotes** - Take notes, anywhere, anytime.

Version: 0.1.0
