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
