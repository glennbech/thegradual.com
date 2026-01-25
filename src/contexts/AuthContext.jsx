import { createContext, useContext, useState, useEffect } from 'react';
import { awsConfig, getAuthorizeUrl } from '../config/aws';
import { getUserId } from '../utils/userManager';
import useWorkoutStore from '../stores/workoutStore';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [identityId, setIdentityId] = useState(null);

  // Debug: Log URL on every render
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Check if there's a code parameter
    if (params.has('code')) {
    }

    // Check for OAuth errors from Cognito
    if (params.has('error')) {
      console.error('❌ COGNITO ERROR:', params.get('error'));
      console.error('❌ ERROR DESCRIPTION:', params.get('error_description'));
    }
  });

  // Initialize Cognito Identity Pool on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Update identityId whenever authentication state changes
  useEffect(() => {
    const currentId = getUserId();
    setIdentityId(currentId);
  }, [isAuthenticated, user]);

  const initializeAuth = async () => {
    try {

      // Check if we're coming back from Cognito OAuth callback (like Sharewaves)
      const urlParams = new URLSearchParams(window.location.search);
      let code = urlParams.get('code');

      // WORKAROUND: Check sessionStorage for code captured by inline script
      // (in case browser extension stripped it from URL)
      const capturedCode = sessionStorage.getItem('oauth_code_captured');
      if (capturedCode && !code) {
        code = capturedCode;
        sessionStorage.removeItem('oauth_code_captured'); // Clean up
      }

      if (code) {
        // Store code temporarily in case of page refresh
        sessionStorage.setItem('oauth_code', code);

        // Exchange authorization code for tokens via BFF
        await handleOAuthCallback(code);

        // Clean up URL and session storage
        sessionStorage.removeItem('oauth_code');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // Check if we have a code in session storage (page refresh case)
        const storedCode = sessionStorage.getItem('oauth_code');
        if (storedCode) {
          await handleOAuthCallback(storedCode);
          sessionStorage.removeItem('oauth_code');
          return; // Don't continue to check for session
        }
        // Check for existing session
        const savedIdToken = localStorage.getItem('idToken');
        if (savedIdToken) {
          // Check if token is expired
          if (isTokenExpired(savedIdToken)) {
            console.log('🔄 Token expired on app load, attempting refresh...');
            // Try to refresh the token
            const newToken = await refreshToken();
            if (newToken) {
              // Successfully refreshed
              const userInfo = parseJWT(newToken);
              setUser(userInfo);
              setIsAuthenticated(true);
            } else {
              // Refresh failed, user is anonymous
              console.log('❌ Token refresh failed on app load, user is now anonymous');
              setIsAuthenticated(false);
              setUser(null);
            }
          } else if (isTokenExpiringSoon(savedIdToken, 60)) {
            // Token expires in < 60 minutes, proactively refresh
            console.log('🔄 Token expiring soon, proactively refreshing...');
            const newToken = await refreshToken();
            if (newToken) {
              const userInfo = parseJWT(newToken);
              setUser(userInfo);
              setIsAuthenticated(true);
            } else {
              // Refresh failed but old token still valid, use it
              const userInfo = parseJWT(savedIdToken);
              setUser(userInfo);
              setIsAuthenticated(true);
            }
          } else {
            // Token is valid and not expiring soon
            const userInfo = parseJWT(savedIdToken);
            setUser(userInfo);
            setIsAuthenticated(true);
          }
        } else {
          // No token, user is anonymous
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      // Fall back to anonymous state
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Migrate data from anonymous user ID to Cognito user ID
   * This preserves workout history when a user signs in for the first time
   */
  const migrateAnonymousData = async (cognitoSub) => {
    try {
      const anonymousUserId = localStorage.getItem('thegradual_user_id');

      // No migration needed if:
      // 1. No anonymous ID exists (new user on new device)
      // 2. Anonymous ID is same as Cognito sub (already migrated)
      if (!anonymousUserId || anonymousUserId === cognitoSub) {
        return;
      }


      // Fetch data from DynamoDB for the anonymous user (if exists)
      // No need to check localStorage - cloud is the source of truth
      try {
        const API_BASE_URL = 'https://api.thegradual.com';
        const response = await fetch(`${API_BASE_URL}/api/${anonymousUserId}`);

        if (response.ok) {
          const anonymousData = await response.json();

          // Check if there's actual data (not just empty arrays)
          const hasApiData =
            (anonymousData.sessions && anonymousData.sessions.length > 0) ||
            (anonymousData.customExercises && anonymousData.customExercises.length > 0) ||
            (anonymousData.customTemplates && anonymousData.customTemplates.length > 0) ||
            anonymousData.activeSession;

          if (hasApiData) {

            // Save the anonymous data under the new Cognito user ID
            const migratedData = {
              uuid: cognitoSub,
              sessions: anonymousData.sessions || [],
              customExercises: anonymousData.customExercises || [],
              customTemplates: anonymousData.customTemplates || [],
              activeSession: anonymousData.activeSession || null,
              lastUpdated: new Date().toISOString()
            };

            // Save to API under new Cognito user ID
            await fetch(`${API_BASE_URL}/api/${cognitoSub}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(migratedData)
            });

          }
        }
      } catch (error) {
      }

      // Update localStorage to use new Cognito ID
      localStorage.setItem('thegradual_user_id', cognitoSub);

    } catch (error) {
      console.error('❌ Error during data migration:', error);
      // Don't throw - we don't want to block authentication if migration fails
    }
  };

  const handleOAuthCallback = async (code) => {
    try {
      // Use current origin as redirect_uri (matches what we sent to Cognito)
      const redirectUri = window.location.origin;


      const response = await fetch(`${awsConfig.bffEndpoint}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: send/receive cookies
        body: JSON.stringify({ code, redirect_uri: redirectUri })
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token exchange failed:', response.status, errorText);
        throw new Error('Token exchange failed');
      }

      const data = await response.json();

      // Store ID token in localStorage
      localStorage.setItem('idToken', data.id_token);

      // Parse ID token to get user info if not provided
      const userInfo = data.user || parseJWT(data.id_token);

      // ==========================================
      // DATA MIGRATION: Anonymous → Authenticated
      // ==========================================
      await migrateAnonymousData(userInfo.sub);

      // ==========================================
      // LOAD DATA FROM DYNAMODB (cloud is the truth)
      // ==========================================
      console.log('🔄 Loading fresh data from DynamoDB after login...');

      // Get Zustand store methods
      const workoutStore = useWorkoutStore.getState();

      // Load fresh data from API
      const result = await workoutStore.loadFromAPI();

      if (result.success) {
        console.log('✅ Successfully loaded fresh data from DynamoDB');
      } else {
        console.warn('⚠️ Failed to load from DynamoDB, but continuing with login:', result.error);
      }

      // Set user info
      setUser(userInfo);
      setIsAuthenticated(true);

    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  };

  const signIn = () => {

    try {

      // Redirect to Cognito Hosted UI (like Sharewaves)
      const authUrl = getAuthorizeUrl();

      // Persistent logging (survives page reload)
      localStorage.setItem('debug_last_login_attempt', JSON.stringify({
        timestamp: new Date().toISOString(),
        authUrl,
        config: {
          domain: awsConfig.oauth.domain,
          clientId: awsConfig.clientId,
          redirectUri: awsConfig.oauth.redirectSignIn,
          scope: awsConfig.oauth.scope,
          responseType: awsConfig.oauth.responseType
        }
      }));

      // Use window.location.assign for better compatibility
      window.location.assign(authUrl);
    } catch (error) {
      console.error('❌ Error in signIn:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      localStorage.setItem('debug_login_error', JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }

  };

  const signOut = async () => {
    try {
      // Call BFF logout endpoint
      await fetch(`${awsConfig.bffEndpoint}/auth/logout`, {
        method: 'POST',
        credentials: 'include' // Send cookies
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear in-memory workout state
      const workoutStore = useWorkoutStore.getState();
      workoutStore.clearCache();

      // Clear auth token
      localStorage.removeItem('idToken');

      // Clear auth state
      setUser(null);
      setIsAuthenticated(false);

      console.log('✅ Logout complete, cache cleared');
    }
  };

  const getValidToken = async () => {
    const idToken = localStorage.getItem('idToken');

    if (!idToken) return null;

    // Check if token is expired
    if (isTokenExpired(idToken)) {
      // Try to refresh
      const newToken = await refreshToken();
      return newToken;
    }

    // Check if token is expiring soon (within 5 minutes)
    if (isTokenExpiringSoon(idToken, 5)) {
      // Refresh proactively
      const newToken = await refreshToken();
      return newToken || idToken; // Return old token if refresh fails
    }

    return idToken;
  };

  const refreshToken = async () => {
    try {
      console.log('🔄 Attempting to refresh token...');
      const response = await fetch(`${awsConfig.bffEndpoint}/auth/refresh`, {
        method: 'POST',
        credentials: 'include' // Send refresh token cookie
      });

      if (!response.ok) {
        console.error('❌ Token refresh failed:', response.status);
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // The refresh endpoint returns { id_token, access_token, expires_in, user }
      // Store the ID token for authentication
      localStorage.setItem('idToken', data.id_token);
      setUser(data.user);

      console.log('✅ Token refreshed successfully');
      return data.id_token;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      // If refresh fails, sign out
      console.log('🔄 Refresh failed, signing out user...');
      await signOut();
      return null;
    }
  };

  const value = {
    user,
    identityId,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    getValidToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper functions
function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

function isTokenExpiringSoon(token, minutesBuffer = 5) {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = minutesBuffer * 60;
  return payload.exp < (now + bufferSeconds);
}
