require('dotenv').config();
const { sheets, spreadsheetId } = require('./config/googleSheet');

async function testConnection() {
  console.log('🔄 Google Sheet Connection Test Start Ho Raha Hai...');
  console.log('Sheet ID:', spreadsheetId);
  console.log('Client Email:', process.env.GOOGLE_CLIENT_EMAIL);

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Doer_Name!A1:E5',
    });

    console.log('\n✅ GOOGLE SHEET CONNECT HO GAYA!');
    console.log('Sheet Data Sample:', res.data.values);
  } catch (err) {
    console.error('\n💥 GOOGLE SHEET CONNECT NAHI HUA!');
    console.error('Error Details:', err.message);
  }
}

testConnection();