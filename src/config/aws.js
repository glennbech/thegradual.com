// AWS Cognito Configuration for TheGradual
// Loads from environment variables (see .env.local for development)

export const awsConfig = {
  region: 'us-east-2',

  // Cognito User Pool (for authentication)
  userPoolId: 'us-east-2_uaXb86Yg1',
  clientId: '1gmn5mu9odm80u0uj8dm4a46pv', // Server client (correct ID - hardcoded to avoid env issues)

  // Cognito Identity Pool (for anonymous + authenticated access)
  identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || 'us-east-2:2cb60670-38b7-4876-858c-e9102a34693d',

  // Cognito Hosted UI domain
  cognitoDomain: import.meta.env.VITE_COGNITO_DOMAIN || 'thegradual-auth.auth.us-east-2.amazoncognito.com',

  // BFF Lambda endpoint
  bffEndpoint: import.meta.env.VITE_BFF_ENDPOINT || 'https://cwxiir473hvnurcous3ogcz3xa0anqfc.lambda-url.us-east-2.on.aws',

  // OAuth configuration
  oauth: {
    domain: import.meta.env.VITE_COGNITO_DOMAIN || 'thegradual-auth.auth.us-east-2.amazoncognito.com',
    scope: ['openid', 'email', 'profile'],
    // Use window.location.origin for dynamic redirect (works in dev, preview, and prod)
    redirectSignIn: window.location.origin,
    redirectSignOut: window.location.origin,
    responseType: 'code'
  }
};

// Helper to get OAuth authorize URL
export const getAuthorizeUrl = () => {
  const { domain, scope, redirectSignIn, responseType } = awsConfig.oauth;
  const { clientId } = awsConfig;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: responseType,
    scope: scope.join(' '),
    redirect_uri: redirectSignIn
  });

  return `https://${domain}/oauth2/authorize?${params.toString()}`;
};

// Helper to get OAuth logout URL
export const getLogoutUrl = () => {
  const { domain, redirectSignOut } = awsConfig.oauth;
  const { clientId } = awsConfig;

  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: redirectSignOut
  });

  return `https://${domain}/logout?${params.toString()}`;
};
