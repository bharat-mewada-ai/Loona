import * as Location from 'expo-location';

/**
 * Requests the device location.
 * @param forceFresh - If true, always fetches a fresh GPS fix (skips last-known cache).
 *                     Use this on manual refresh to ensure the server gets current coordinates.
 */
export const requestLocation = async (forceFresh = false) => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    // Fast fallback: try last known position first (e.g. within 5 mins)
    // Skip this when forceFresh=true (e.g. manual refresh button press)
    if (!forceFresh) {
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown && Date.now() - lastKnown.timestamp < 5 * 60 * 1000) {
        return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
      }
    }

    // Fetch a fresh GPS position with High accuracy when force-refreshing
    let loc = await Location.getCurrentPositionAsync({
      accuracy: forceFresh ? Location.Accuracy.High : Location.Accuracy.Balanced,
    });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch (err) {
    console.error('Location error:', err);
    return null;
  }
};
