# CloudNotes

CloudNotes is an open-source note-taking application designed for simplicity, productivity, and privacy. Create, organize, and access your notes from anywhere with our powerful Markdown editor, folder organization, and cloud integrations.

![CloudNotes Screenshot](/cloudnotes-screenshot.png)

## Features

### Current Features
- **User Authentication**: Secure signup, login, and profile management with Supabase Auth
- **Beautiful UI**: Clean, intuitive interface built with React and Tailwind CSS
- **Markdown Editor**: Rich text editing with Markdown support
- **Categories & Folders**: Organize your notes with a flexible structure
- **Dark Mode**: Eye-friendly dark theme option
- **Profile Management**: Customize your user profile
- **Calendar View**: View and organize notes by date
- **Newsletter Subscription**: Stay updated with the latest features and updates
- **Responsive Design**: Works seamlessly across desktop and mobile devices

### Coming Soon
- **Cloud Storage Integration**: Sync with popular cloud storage providers
- **Collaboration**: Share and co-edit notes with others
- **Notes Export/Import**: Support for various file formats
- **Advanced Search**: Full-text search across all your notes
- **Offline Support**: Work without an internet connection
- **API Access**: Connect with other tools and services
- **Templates**: Ready-to-use note templates for different purposes
- **Extensions**: Expand functionality with third-party plugins

## Tech Stack
- **Frontend**: React.js, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Hosting**: Vercel
- **Other Tools**: Vite, ESLint, React Router

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/cloudnotes-react.git
   cd cloudnotes-react
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```
   Then fill in your Supabase credentials in the `.env.local` file.

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser to see the app.

## Project Structure
```
cloudnotes-react/
├── public/           # Static assets
├── src/
│   ├── components/   # UI components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utilities and libraries
│   ├── pages/        # App pages
│   ├── styles/       # Global styles
│   └── App.tsx       # Main app component
├── supabase/         # Supabase configuration and migrations
└── .env.example      # Example environment variables
```

## Contributing

We welcome contributions to CloudNotes! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and follow the code style guidelines.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

- Project Link: [https://github.com/yourusername/cloudnotes-react](https://github.com/yourusername/cloudnotes-react)
- Developer: [Your Name](https://yourwebsite.com)

## Profile Creation Fix

We've fixed an issue with profile creation after signup. This ensures that all users will have profiles created regardless of email confirmation status.

### Testing the Fix

1. Apply the migration:
   ```bash
   supabase db reset
   ```

2. Verify with diagnostics:
   - Log in and navigate to `/diagnose` to access the diagnostics page
   - Use the "Fix Profile Issues" button if needed

For detailed information about the fix, see [the profile creation fix documentation](docs/profile_creation_fix.md).

---

Made with ❤️ by CloudNotes Team
