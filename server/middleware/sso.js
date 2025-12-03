import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as SamlStrategy } from 'passport-saml';
import crypto from 'crypto';
import fs from 'fs';
import { getConfig } from '../../config/loader.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

// Dynamically import openid-client only if needed
let Issuer = null;
let OpenIDConnectStrategy = null;

let oidcIssuer = null;
let oidcClient = null;

/**
 * Initialize OIDC/OAuth2 strategy
 */
export const initializeOIDC = async () => {
  const ssoConfig = getConfig('sso');
  
  if (!ssoConfig.enabled || !ssoConfig.oidc.enabled) {
    return;
  }

  try {
    const oidcConfig = ssoConfig.oidc;
    
    // Try to load openid-client dynamically
    try {
      const openidClientModule = await import('openid-client');
      Issuer = openidClientModule.Issuer;
      OpenIDConnectStrategy = openidClientModule.Strategy;
    } catch (importError) {
      logger.warn('openid-client not available, using OAuth2 fallback', { error: importError.message });
    }
    
    // Try to use OpenID Connect Discovery if issuer is provided and openid-client is available
    if (oidcConfig.issuer && Issuer) {
      try {
        oidcIssuer = await Issuer.discover(oidcConfig.issuer);
        oidcClient = new oidcIssuer.Client({
          client_id: oidcConfig.clientId,
          client_secret: oidcConfig.clientSecret,
          redirect_uris: [oidcConfig.callbackURL],
          response_types: ['code'],
        });
        
        logger.info('OIDC issuer discovered', { issuer: oidcConfig.issuer });
      } catch (discoverError) {
        logger.warn('OIDC discovery failed, falling back to manual configuration', { error: discoverError.message });
      }
    }

    // Use OpenID Connect strategy if discovery worked and strategy is available
    if (oidcClient && OpenIDConnectStrategy) {
      passport.use('oidc', new OpenIDConnectStrategy({
        client: oidcClient,
        params: {
          scope: oidcConfig.scope || 'openid profile email',
        },
      }, async (tokenset, userinfo, done) => {
        try {
          const user = await findOrCreateSSOUser({
            username: userinfo[oidcConfig.usernameAttribute] || userinfo.preferred_username || userinfo.sub,
            email: userinfo[oidcConfig.emailAttribute] || userinfo.email,
            firstName: userinfo[oidcConfig.firstNameAttribute] || userinfo.given_name,
            lastName: userinfo[oidcConfig.lastNameAttribute] || userinfo.family_name,
            provider: 'oidc',
            providerId: userinfo.sub,
          });
          return done(null, user);
        } catch (error) {
          logger.error('Error in OIDC authentication', { error: error.message, stack: error.stack });
          return done(error, null);
        }
      }));
    } else {
      // Fallback to OAuth2 strategy with manual configuration
      passport.use('oidc', new OAuth2Strategy({
        authorizationURL: oidcConfig.authorizationURL || `${oidcConfig.issuer}/protocol/openid-connect/auth`,
        tokenURL: oidcConfig.tokenURL || `${oidcConfig.issuer}/protocol/openid-connect/token`,
        clientID: oidcConfig.clientId,
        clientSecret: oidcConfig.clientSecret,
        callbackURL: oidcConfig.callbackURL,
        scope: oidcConfig.scope || 'openid profile email',
      }, async (accessToken, refreshToken, params, done) => {
        try {
          // Fetch user info from userinfo endpoint
          const userInfoURL = oidcConfig.userInfoURL || `${oidcConfig.issuer}/protocol/openid-connect/userinfo`;
          const userInfoResponse = await fetch(userInfoURL, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (!userInfoResponse.ok) {
            throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
          }
          
          const userinfo = await userInfoResponse.json();
          
          const user = await findOrCreateSSOUser({
            username: userinfo[oidcConfig.usernameAttribute] || userinfo.preferred_username || userinfo.sub,
            email: userinfo[oidcConfig.emailAttribute] || userinfo.email,
            firstName: userinfo[oidcConfig.firstNameAttribute] || userinfo.given_name,
            lastName: userinfo[oidcConfig.lastNameAttribute] || userinfo.family_name,
            provider: 'oidc',
            providerId: userinfo.sub,
          });
          return done(null, user);
        } catch (error) {
          logger.error('Error in OAuth2 authentication', { error: error.message, stack: error.stack });
          return done(error, null);
        }
      }));
    }
    
    logger.info('OIDC/OAuth2 strategy initialized');
  } catch (error) {
    logger.error('Failed to initialize OIDC strategy', { error: error.message, stack: error.stack });
  }
};

/**
 * Initialize SAML strategy
 */
export const initializeSAML = () => {
  const ssoConfig = getConfig('sso');
  
  if (!ssoConfig.enabled || !ssoConfig.saml.enabled) {
    return;
  }

  try {
    const samlConfig = ssoConfig.saml;
    
    // Handle certificate - could be a file path or certificate content
    let cert = samlConfig.cert;
    if (cert && fs.existsSync && fs.existsSync(cert)) {
      // If it's a file path, read the file
      try {
        cert = fs.readFileSync(cert, 'utf8');
      } catch (readError) {
        logger.warn('Failed to read SAML certificate file, using as-is', { error: readError.message });
      }
    }
    
    // Log SAML configuration for debugging
    logger.info('Initializing SAML strategy', {
      entryPoint: samlConfig.entryPoint,
      issuer: samlConfig.issuer,
      callbackUrl: samlConfig.callbackURL,
      hasCert: !!cert,
    });
    
    passport.use('saml', new SamlStrategy({
      entryPoint: samlConfig.entryPoint,
      issuer: samlConfig.issuer, // This must match the Keycloak client ID exactly
      callbackUrl: samlConfig.callbackURL, // This becomes AssertionConsumerServiceURL in SAML request
      cert: cert,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      // Keycloak-specific options
      acceptedClockSkewMs: -1, // Disable clock skew check
      disableRequestedAuthnContext: true,
      // Ensure the issuer is sent correctly
      additionalParams: {},
      additionalAuthorizeParams: {},
      // Force the issuer to be sent in the request
      forceAuthn: false,
      authnContext: false,
    }, async (profile, done) => {
      try {
        logger.info('SAML profile received', {
          profileKeys: Object.keys(profile || {}),
          nameID: profile?.nameID,
          email: profile?.email,
          usernameAttribute: samlConfig.usernameAttribute,
          emailAttribute: samlConfig.emailAttribute,
        });
        
        const username = profile[samlConfig.usernameAttribute] || profile.nameID || profile.email;
        const email = profile[samlConfig.emailAttribute] || profile.email || profile.nameID;
        const firstName = profile[samlConfig.firstNameAttribute] || profile.firstName;
        const lastName = profile[samlConfig.lastNameAttribute] || profile.lastName;
        
        if (!username && !email) {
          logger.error('SAML profile missing username and email', { profile });
          return done(new Error('SAML profile missing required attributes'), null);
        }
        
        const user = await findOrCreateSSOUser({
          username: username || email,
          email: email || username,
          firstName: firstName,
          lastName: lastName,
          provider: 'saml',
          providerId: profile.nameID || profile.email || username,
        });
        
        logger.info('SAML user found/created', { userId: user.id, username: user.username });
        return done(null, user);
      } catch (error) {
        logger.error('Error in SAML authentication', { 
          error: error.message, 
          stack: error.stack,
          profile: profile ? Object.keys(profile) : 'no profile',
        });
        return done(error, null);
      }
    }));
    
    logger.info('SAML strategy initialized');
  } catch (error) {
    logger.error('Failed to initialize SAML strategy', { error: error.message, stack: error.stack });
  }
};

/**
 * Find or create a user from SSO provider
 */
const findOrCreateSSOUser = async ({ username, email, firstName, lastName, provider, providerId }) => {
  logger.debug('findOrCreateSSOUser called', { username, email, provider, providerId });
  
  if (!username && !email) {
    logger.error('SSO user creation failed: no username or email', { provider, providerId });
    throw new Error('Username or email is required from SSO provider');
  }

  try {
    // Try to find user by email first
    let user = email ? await User.findByEmail(email) : null;
    
    // If not found by email, try by username
    if (!user && username) {
      user = await User.findByUsername(username);
    }

    if (user) {
      // Update user info if needed
      const updates = {};
      if (email && user.email !== email) {
        updates.email = email;
      }
      if (firstName && !user.first_name) {
        updates.first_name = firstName;
      }
      if (lastName && !user.last_name) {
        updates.last_name = lastName;
      }
      
      if (Object.keys(updates).length > 0) {
        await User.update(user.id, updates);
        user = await User.findById(user.id);
      }
      
      logger.info('SSO user found', { userId: user.id, username: user.username, provider });
      return user;
    }

    // Create new user
    // Determine role - first user becomes admin
    const hasUsers = (await User.count()) > 0;
    const role = hasUsers ? 'user' : 'admin';

    // Generate a random password (won't be used for SSO users)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    
    const userData = {
      username: username || email.split('@')[0],
      email: email || `${username}@sso.local`,
      password: randomPassword, // SSO users don't use password
      role,
      first_name: firstName,
      last_name: lastName,
    };
    
    logger.debug('Creating SSO user', { userData: { ...userData, password: '[REDACTED]' } });
    
    user = await User.create(userData);

    logger.info('SSO user created', { userId: user.id, username: user.username, email: user.email, role, provider });
    return user;
  } catch (error) {
    logger.error('Error in findOrCreateSSOUser', { 
      error: error.message, 
      stack: error.stack,
      username,
      email,
      provider 
    });
    throw error;
  }
};

/**
 * Serialize user for session
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Initialize all SSO strategies
 */
export const initializeSSO = async () => {
  await initializeOIDC();
  initializeSAML();
};

