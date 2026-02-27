const ACCESS_TOKEN_KEY  = 'snap_access_token';
const REFRESH_TOKEN_KEY = 'snap_refresh_token';

export const tokenUtils = {
  getAccessToken:  ()      => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: ()      => localStorage.getItem(REFRESH_TOKEN_KEY),
  setAccessToken:  (t: string) => localStorage.setItem(ACCESS_TOKEN_KEY, t),
  setRefreshToken: (t: string) => localStorage.setItem(REFRESH_TOKEN_KEY, t),
  clearTokens:     ()      => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};