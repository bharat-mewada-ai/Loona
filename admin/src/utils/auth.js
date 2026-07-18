import { jwtDecode } from 'jwt-decode';

export const getAuthToken = () => localStorage.getItem('loona_admin_token');

export const saveAuthToken = (token) => localStorage.setItem('loona_admin_token', token);

export const clearAuthToken = () => localStorage.removeItem('loona_admin_token');

export const getAdminUser = () => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      clearAuthToken();
      return null;
    }
    return decoded;
  } catch (e) {
    return null;
  }
};

export const isStaff = () => {
  const user = getAdminUser();
  return user && (user.role === 'admin' || user.role === 'moderator');
};

export const isSuperAdmin = () => {
  const user = getAdminUser();
  return user && user.role === 'admin';
};

/**
 * Returns true only for the app owner (Bharat).
 * Compares logged-in user's ID against REACT_APP_OWNER_USER_ID env variable or hardcoded fallback.
 * Even if Piyush has admin role, he cannot see owner-only sections.
 */
export const isOwner = () => {
  const user = getAdminUser();
  const ownerId = process.env.REACT_APP_OWNER_USER_ID || '6a004728bf755360f8814adb';
  if (!user) return false;
  return user.id === ownerId || user._id === ownerId;
};


