const { google } = require('googleapis');
require('dotenv').config();

// Private Key Format Cleaner
let rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY || '';

// Quotes aur escaped newlines clean karna
if (rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')) {
  rawPrivateKey = rawPrivateKey.slice(1, -1);
}
const formattedPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');

const credentials = {
  type: process.env.GOOGLE_TYPE || 'service_account',
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: formattedPrivateKey,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
};

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });
const spreadsheetId = process.env.SPREADSHEET_ID;

module.exports = {
  sheets,
  drive,
  spreadsheetId,
};