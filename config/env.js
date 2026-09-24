const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const validateEnv = () => {
  const requiredEnvVars = [
    'GOOGLE_TYPE', 'GOOGLE_PROJECT_ID', 'GOOGLE_PRIVATE_KEY_ID', 'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL', 'GOOGLE_CLIENT_ID', 'GOOGLE_AUTH_URI', 'GOOGLE_TOKEN_URI',
    'GOOGLE_AUTH_PROVIDER_X509_CERT_URL', 'GOOGLE_CLIENT_X509_CERT_URL', 'GOOGLE_UNIVERSE_DOMAIN',
    'SPREADSHEET_ID', 'PORT', 
    
  ];
  
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingEnvVars.length > 0) {
    console.error('Missing environment variables:', missingEnvVars);
    process.exit(1);
  }
};

module.exports = { validateEnv };