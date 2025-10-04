# Pawsome Client

A React single-page application for Pawsome NGO that provides real-time chat, incident reporting and tracking, volunteer management, and basic inventory features. The app is built with Vite and ships as a Progressive Web App (PWA). Routing uses a hash-based router suitable for GitHub Pages deployment.

## Overview
- Real-time chat (STOMP over SockJS)
- Incident reporting, live incident feed, details, media, and team assignment
- Volunteer profiles, standings, and case management
- Basic inventory and first-aid kit management
- JWT-based authentication (stored in localStorage)
- PWA support (installable, offline-ready shell)

## Tech Stack
- Language: JavaScript (ES Modules)
- UI: React 19
- Router: React Router (HashRouter)
- Build tool/bundler: Vite 7
- PWA: vite-plugin-pwa
- Realtime: @stomp/stompjs, sockjs-client
- Linting: ESLint 9 with React Hooks/Refresh plugins
- Deployment: gh-pages (to GitHub Pages)

## Requirements
- Node.js >= 18 (Vite 7 requires Node 18+)
- npm (comes with Node)

## Getting Started
1. Install dependencies
   - npm install
   - or, for CI reproducibility: npm ci
2. Start the dev server
   - npm run dev
   - The app will be available at http://localhost:5173 (or the host/port shown in the terminal). The dev server is configured to listen on all hosts.
3. Build for production
   - npm run build
   - Output goes to the dist directory.
4. Preview the production build locally
   - npm run preview

## Scripts
- npm run dev — start Vite dev server
- npm run build — build production bundle
- npm run preview — serve the production build locally
- npm run lint — run ESLint on the project
- npm run deploy — publish dist to GitHub Pages via gh-pages (runs predeploy build first)

## Environment Variables
The application expects the backend base URL via a Vite env variable:
- VITE_API_BASE_URL — Base URL of the backend API (e.g., http://localhost:8080 or your deployed backend). Many pages default to http://localhost:8080 when this is not set, but some require the variable to be present.

How to set:
- Create a .env file in the project root (not committed by default) with: VITE_API_BASE_URL=http://localhost:8080
- You can also set environment variables on your hosting/CI provider.

## Entry Points
- index.html — application HTML entry that loads the app
- src/main.jsx — React entry that mounts the app to #root
- src/App.jsx — top-level router and layout, uses HashRouter and sets up routes for login, chat, incidents, volunteers, inventory, etc.

## Project Structure
High-level layout (not exhaustive):
- public/ — static assets copied as-is
- src/
  - App.jsx — main app component with routes
  - main.jsx — React bootstrap
  - components/
    - layout/Navbar.jsx — top navigation bar shown on protected pages
    - common/… — shared modals and UI components (e.g., UpdatePasswordModal)
  - hooks/
    - useWebSocket.js — STOMP/SockJS setup using VITE_API_BASE_URL
  - pages/
    - auth/ (LoginPage.jsx, SignUpPage.jsx)
    - chat/ (ChatGroupsPage.jsx, ChatWindow.jsx, components/…)
    - incident/ (LivePage.jsx, IncidentDetailPage.jsx, IncidentMediaPage.jsx, ReportIncidentPage.jsx, components/TeamAssignmentPage.jsx)
    - user/ (MyCasesPage.jsx, ProfilePage.jsx, StandingsPage.jsx, VolunteersPage.jsx, VolunteerProfilePage.jsx, components/…)
    - admin/ (ApprovalsPage.jsx)
    - inventory/ (InventoryPage.jsx, FirstAidKitPage.jsx)
    - static/ (AdoptionsPage.jsx, EventsPage.jsx)
  - index.css and various .module.css files — styling
- vite.config.js — Vite and PWA configuration (manifest, icons, base, dev server)
- eslint.config.js — ESLint config
- package.json — dependencies and scripts

## Running Against a Backend
- Ensure the backend service is running and accessible at the URL configured in VITE_API_BASE_URL.
- WebSocket endpoints are used for chat and live updates (STOMP over SockJS). Ensure CORS and WS are allowed by the server for your dev origin.

## PWA Notes
- The app registers a service worker (vite-plugin-pwa with registerType: autoUpdate) and includes PWA icons and manifest metadata.
- When updating the app, the service worker will update automatically. You may need to refresh to activate a new version.

## Tests
- No automated test setup (e.g., Jest/Vitest) detected in this repository. TODO: Add unit and integration tests and document how to run them.

## Deployment
- The project is set up to deploy to GitHub Pages using gh-pages.
- Homepage (package.json): https://pawsome-ngo.github.io
- HashRouter is used to support static hosting on GitHub Pages.

Deploy steps:
1. Ensure you have push access and the gh-pages package installed (devDependency already present).
2. Set the repository's Pages settings (e.g., deploy from gh-pages branch).
3. Run: npm run deploy
   - This runs npm run build and publishes dist/ to the gh-pages branch.

## Environment/Secrets in CI
- If deploying from CI, configure VITE_API_BASE_URL as a build-time environment variable in the CI settings.

## License
- TODO: Add a LICENSE file and specify the license here.

## Acknowledgements
- This project was bootstrapped with Vite’s React template and extended with React Router, PWA, STOMP/SockJS, and GitHub Pages deployment.
