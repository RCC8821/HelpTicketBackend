const express = require('express');
const router = express.Router();
const { sheets, spreadsheetId } = require('../config/googleSheet');

const DOER_SHEET_NAME = 'Doer_Name';

router.post('/login', async (req, res) => {
  console.log('\n📩 [LOGIN REQUEST RECEIVED FOR]:', req.body.email);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  try {
    const getRows = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${DOER_SHEET_NAME}!A2:E100`,
    });

    const rows = getRows.data.values || [];
    console.log(`📊 Found ${rows.length} users in Doer_Name sheet`);

    // Match Email (Col D / Index 3) and Password (Col E / Index 4)
    const user = rows.find(
      row =>
        row[3] && row[3].trim().toLowerCase() === email.trim().toLowerCase() &&
        row[4] && String(row[4]).trim() === String(password).trim()
    );

    if (user) {
      console.log('🎉 LOGIN MATCH SUCCESSFUL FOR:', user[0]);
      return res.json({
        success: true,
        user: {
          name: user[0],
          designation: user[1] || 'User',
          email: user[3],
        },
        message: 'Login successful',
      });
    } else {
      console.log('❌ INVALID CREDENTIALS FOR:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('💥 LOGIN ERROR:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message,
    });
  }
});

module.exports = router;