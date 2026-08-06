# Loona Admin Panel

The admin dashboard for moderating Loona.

## Architecture
- **Framework:** Create React App (React)
- **Routing:** React Router v6
- **Styling:** Custom CSS
- **Host:** Netlify (configured via `netlify.toml`)

## Setup

1. Add environment variables. You must provide `REACT_APP_API_URL` pointing to the backend and `REACT_APP_OWNER_USER_ID` for owner-only sections:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_OWNER_USER_ID=<your-mongodb-object-id>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm start
   ```

## Deployment
This app uses `react-scripts build` and relies on `netlify.toml` to redirect all traffic to `index.html` for client-side routing.
