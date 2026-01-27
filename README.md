# PI Frontend - React Native

React Native application using Expo.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

## Environment Variables

The app uses environment variables prefixed with `EXPO_PUBLIC_` for Supabase configuration. These are configured in `app.json` and `.env`.

## Notes

- Only the backend server interacts directly with the database
- Frontend uses Supabase client for authentication and real-time features only
- All database operations should go through the backend API
