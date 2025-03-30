
# Development Guide

## Technology Stack

- **Frontend**:
  - Vite
  - TypeScript
  - React
  - shadcn-ui
  - Tailwind CSS

## Project Structure

- `/src` - Source code
  - `/components` - React components
  - `/hooks` - Custom React hooks
  - `/services` - Service layer
  - `/utils` - Utility functions

## Component Architecture

```
┌─────────────────────────────────────────────┐
│                  App.tsx                     │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│             Dashboard Component              │
└───┬─────────────┬───────────────┬───────────┘
    │             │               │
    ▼             ▼               ▼
┌─────────┐  ┌─────────┐  ┌─────────────────┐
│ SensorA │  │ SensorB │  │  DashboardTabs  │
└─────────┘  └─────────┘  └────────┬────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Tab Components    │
                         │ - Statistics      │
                         │ - Thresholds      │
                         │ - Calibration     │
                         │ - Diagnostics     │
                         │ - Settings        │
                         └───────────────────┘
```

## Data Flow

```
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│              │     │               │     │                │
│ SerialReader │────►│ SerialService │────►│ React          │
│ (Arduino)    │     │               │     │ Components     │
│              │     │               │     │                │
└──────────────┘     └───────────────┘     └────────────────┘
                            │                      │
                            │                      │
                            ▼                      ▼
                     ┌─────────────┐      ┌──────────────────┐
                     │             │      │                  │
                     │ LocalStorage│◄─────┤ User Settings    │
                     │             │      │ & Preferences    │
                     └─────────────┘      │                  │
                                          └──────────────────┘
```

## Development Workflow

1. Make changes using Lovable or your preferred IDE
2. Test changes locally
3. Deploy using Docker or direct deployment

### Setup Local Development Environment

1. **Clone the repository**:
```bash
git clone <repository-url>
cd <project-directory>
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```

4. **Build for production**:
```bash
npm run build
```

## Code Style Guidelines

- Use functional components with hooks
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Keep components small and focused
- Follow the principle of single responsibility

## Custom Hooks

The application uses several custom hooks:

- `useSerialConnection` - Manages serial connection state
- `useDataHistory` - Tracks historical sensor data
- `useNotifications` - Handles system notifications
- `useThresholds` - Manages alert thresholds

## Adding New Features

1. **Create new components** in the appropriate directory
2. **Update existing services** if needed
3. **Add to the UI** through the Dashboard or relevant parent component
4. **Test thoroughly** before deploying

## Custom Domain Setup

Refer to [Lovable documentation](https://docs.lovable.dev/tips-tricks/custom-domain/) for custom domain configuration.
