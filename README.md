
# ElServe - Church Service Roster Management

A web application built with React and Express that helps church members manage their availability for upcoming services and administrators coordinate service rosters.

## Features

- **User Authentication**: Secure login system with PIN-based authentication
- **Availability Management**: Members can easily indicate their availability for upcoming services
- **Service Role Management**: Define and manage different service roles (e.g., Worship Leader, Drummer)
- **Roster Builder**: Drag-and-drop interface for creating service rosters
- **PDF Generation**: Generate and email service rosters in PDF format
- **Special Days**: Mark and manage special service days with custom colors
- **Verse of the Day**: Display encouraging Bible verses related to serving

## Tech Stack

- Frontend: React with TypeScript
- Backend: Express.js
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS with Shadcn/UI components
- PDF Generation: @react-pdf/renderer
- Email: Nodemailer

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm run dev
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and latest updates.

## Project Structure

```
├── client/          # Frontend React application
├── server/          # Express backend
├── shared/          # Shared TypeScript types and schemas
└── scripts/         # Utility scripts
```

## Features in Development

- Multi-language support
- Calendar integration
- Mobile app version
- Service statistics and reporting

## License

MIT
