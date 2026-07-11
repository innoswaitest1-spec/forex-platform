const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ---------- CONFIG ----------
const API_KEY = 'aa04a31f26164d5b8f9aaad02c75da4d'; // <- replace with your free key
const ADMIN_PASSWORD = 'innoswa2024!'; // change this

// ---------- LIVE PRICE ----------
app.get('/api/price/:symbol', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.twelvedata.com/price?symbol=${req.params.symbol}&apikey=${API_KEY}`
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: 'Price fetch failed' });
  }
});

// ---------- NY CLOSE ANALYSIS ----------
app.get('/api/analysis/ny-close/:symbol', async (req, res) => {
  try {
    // get last 2 daily candles
    const candles = await axios.get(
      `https://api.twelvedata.com/time_series?symbol=${req.params.symbol}&interval=1day&outputsize=2&apikey=${API_KEY}`
    );
    const data = candles.data.values;
    if (!data || data.length < 2) return res.json({ message: 'Not enough data' });

    const prevDay = data[1]; // yesterday's candle
    const priceRes = await axios.get(
      `https://api.twelvedata.com/price?symbol=${req.params.symbol}&apikey=${API_KEY}`
    );
    const currentPrice = parseFloat(priceRes.data.price);

    const analysis = {
      symbol: req.params.symbol,
      ny_close_high: parseFloat(prevDay.high),
      ny_close_low: parseFloat(prevDay.low),
      ny_close_close: parseFloat(prevDay.close),
      current_price: currentPrice,
      breakout_up: currentPrice > prevDay.high,
      breakout_down: currentPrice < prevDay.low,
      suggested_strategy: currentPrice > prevDay.high ? 'ORB Breakout' : 'Wyckoff / Reversal',
      status: currentPrice > prevDay.high ? 'Bullish breakout' :
               currentPrice < prevDay.low ? 'Bearish breakout' : 'Inside zone (consolidation)'
    };
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// ---------- ADMIN LOGIN ----------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, 'secret123', { expiresIn: '1d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ---------- SIMULATED TRADE (later connect to MT5) ----------
app.post('/api/trade/execute', (req, res) => {
  const { symbol, volume, action } = req.body;
  console.log(`Simulated trade: ${action} ${volume} ${symbol}`);
  res.json({ success: true, orderId: Date.now() });
});

// All other routes → serve index.html (for SPA-like behaviour)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
