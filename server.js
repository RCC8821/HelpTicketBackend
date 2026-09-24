// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// const authRoutes = require('./routes/auth');
// const ticketRoutes = require('./routes/tickets');

// app.use('/api/auth', authRoutes);
// app.use('/api/tickets', ticketRoutes);

// app.get('/', (req, res) => {
//   res.json({ success: true, message: '🎫 HelpTicket Backend is running! 🚀' });
// });

// const PORT = process.env.PORT || 8000;

// app.listen(PORT, () => {
//   console.log(`\n=========================================`);
//   console.log(`🚀 Server listening on http://localhost:${PORT}`);
//   console.log(`=========================================\n`);
// });



const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());

// Limit ko badha kar 100MB kar diya gaya hai
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: '🎫 HelpTicket Backend is running! 🚀' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`\n=========================================`);
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`=========================================\n`);
});


// Pehle se app.listen(...) likha hoga, uske bilkul niche yeh likh dein:
module.exports = app;