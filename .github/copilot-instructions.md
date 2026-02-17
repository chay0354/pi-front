# PI Real Estate Frontend - AI Agent Instructions

## Project Overview

React Native (Expo) application for a real estate platform with multi-tenant subscription model (broker, company, professional, user). Supports RTL (Hebrew) and manages property listings through TikTok-inspired social feed interface.

## Architecture & Key Patterns

### State Management

- **No Redux**: Uses React Context API minimally (`ContextHook` in `hooks/ContextHook.js`)
- **Local AsyncStorage**: User session stored at `pi_current_user` (see `App.js` lines 59-70)
- **Component-level state**: Each screen manages form state locally
- **Global state in App.js**: `currentUser`, `subscriptionData`, `uploadedListings`, `selectedCategory` passed via props

### Screen Navigation

- Manual string-based navigation via `currentScreen` state (no React Navigation library)
- Screen names defined in `App.js` as constants with naming pattern: `${flowName}${variant}` (e.g., `subscription`, `subscriptionCompany`, `subscriptionProfessional`)
- Add new screens by: 1) defining name in `screenName` object, 2) adding case in render logic, 3) importing component from `screens/index.js`

### Backend Integration

- **API URL**: `process.env.EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3000`)
- **Key endpoints** in `utils/api.js`:
  - `POST /api/subscription/submit` - submit forms with multipart file upload
  - `POST /api/listings/upload` - upload property listings
  - `GET /api/listings` - fetch listings
  - `POST /api/auth/verify-code` - verify OTP codes
- **FormData handling**: Flatten JSON fields with `JSON.stringify()` for nested objects/arrays; React Native requires `{uri, type, name}` format for files

### Form Architecture

**AdsForm.js pattern** (1762 lines - refactor candidate):

- Renders dynamic form sections based on `userCategoryForm[categoryId].fields` mapping in `constants/constant.js`
- Form elements in `components/FormsElement/` directory (Title, MultiImageWithVideo, PriceCount, etc.)
- Custom components (AgeRangeSlider, ColorSelector) embedded directly in AdsForm - extract to `components/` if reused
- State shape: `formData` object collecting field values; `files` object for media uploads

### Styling Conventions

- **No CSS-in-JS library**: Direct `StyleSheet.create()` calls in each component
- **Centralized constants** in `constants/styles.js`: Colors, Spacing, BorderRadius, FontSizes, Gaps, Padding, Dimensions
- **Import pattern**: `import {Colors, Spacing} from '../constants/styles'`
- **Color palette**: Deep blue (`#1e1d27`), cyan accents (`#60e7ff`), yellow CTAs (`#ffc40a`)

### Component Hierarchy

```
App.js (router)
├── SubscriptionScreen (choose plan)
├── SubscriptionFormScreen (fill details + upload media)
├── AdsForm (property listing builder - COMPLEX)
├── TikTokFeedScreen (browse listings)
└── [LoginScreen, SettingsScreen, etc.]
```

### Fonts & Typography

- Font loading via `expo-font` in `App.js` (line 19)
- Font definitions in `utils/fonts.js` - add new fonts here, not inline

### Media Upload Flow

1. User selects image/video via `expo-image-picker`
2. File stored in state as `{uri, type, name}`
3. On form submit, passed to API as FormData multipart
4. Backend validates and stores; URL returned and saved to listings

## File Organization

- **`screens/`**: Page-level components (one per screen)
- **`components/FormsElement/`**: Reusable form field components
- **`utils/api.js`**: All fetch calls - centralize here for easy debugging
- **`utils/constant.js`**: Static data (categories, subscriptions, field mappings)
- **`constants/styles.js`**: Design tokens from Figma
- **`hooks/ContextHook.js`**: Minimal; can expand for global user context

## Common Tasks

### Add a New Form Field

1. Create component in `components/FormsElement/NewField.js` following existing pattern (import `Colors`, accept `value` and `onChange` props)
2. Add field name to `userCategoryForm[categoryId].fields` array in `utils/constant.js`
3. In AdsForm, add case to render switch statement
4. Include in `formData` collection and file upload logic

### Debug API Issues

- Check `utils/api.js` for endpoint correctness
- Ensure `EXPO_PUBLIC_API_URL` is set in `.env` and `app.json`
- Log FormData: iterate and log each field before fetch
- For file uploads, verify `{uri, type, name}` structure

### Add New Subscription Type

1. Add to `subscriptionTypes` in `utils/constant.js`
2. Create form variant: duplicate `subscriptionFormCompany` pattern in `screens/`
3. Add screen names in `App.js` `screenName` object
4. Add navigation logic in App render conditional
5. Add corresponding category list (`companyCategories`, `brokerCategories`, etc.)

## Development Commands

```bash
npm start          # Start Expo dev server (choose platform interactively)
npm run android    # Build for Android
npm run ios        # Build for iOS
npm run web        # Build for web (using webpack)
```

## Data Flow Notes

- Backend handles all database operations; frontend is presentational/auth-only via Supabase client (per README)
- Listings state is ephemeral for TikTok feed immediate display; source of truth is backend
- User preferences stored in AsyncStorage only for session persistence; server is system of record

## Language Support

- Hebrew content in UI and category names (RTL handling via React Native defaults)
- Add new Hebrew strings to `utils/strings.js`
