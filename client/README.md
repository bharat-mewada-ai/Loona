# Loona Client (Mobile App)

The cross-platform mobile application for Loona.

## Architecture
- **Framework:** React Native + Expo (SDK ~54)
- **Routing:** Expo Router (~6)
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query) v5
- **Media:** expo-av (audio), Cloudinary (images)

## Setup

1. Copy or create a `.env` file with the required public variables:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api/v1
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android-client-id>
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo bundler:
   ```bash
   npx expo start
   ```

## Building & Updates
This app uses **EAS Build** for creating the production APK/AAB files, and **EAS Update** for instant Over-The-Air (OTA) updates.

- **To build:** `eas build --platform android --profile production`
- **To update:** `eas update --branch production --message "Update description"`
