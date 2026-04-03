require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

const PORT = process.env.PORT || 3000;

// In-memory storage (later replace with DB)
const users = {};

// Homepage (Render requirement)
app.get('/', (req, res) => {
  res.send('Bot is running 🚀');
});


// =======================
// 🔐 LOGIN FLOW
// =======================

// Start → force login
bot.start((ctx) => {
  const userId = ctx.from.id;

  if (!users[userId] || !users[userId].loggedIn) {
    users[userId] = { step: 'mobile' };
    return ctx.reply("📱 Enter your mobile number:");
  }

  ctx.reply("✅ Already logged in!");
});


// Step 1: Mobile → Send OTP
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (!users[userId]) return;

  // Step: Enter mobile
  if (users[userId].step === 'mobile') {
    users[userId].mobile = text;

    try {
      const response = await axios.post(
        "https://www.jio.com/api/jio-numbermanagement-service/number/choicenumber/send-otp",
        {
          mobileNumber: text,
          source: "JIO"
        },
        {
          headers: {
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Origin": "https://www.jio.com",
            "Referer": "https://www.jio.com/selfcare/choice-number/?action=preferred-number",
            "User-Agent": "Mozilla/5.0"
          },
          withCredentials: true
        }
      );

      // Save cookies
      users[userId].cookies = response.headers['set-cookie'];

      users[userId].step = 'otp';

      ctx.reply("📩 OTP sent! Enter OTP:");

    } catch (err) {
      console.log(err.response?.data || err.message);
      ctx.reply("❌ Failed to send OTP");
    }
  }

  // Step: Enter OTP
  else if (users[userId].step === 'otp') {

    try {
      const response = await axios.post(
        "https://www.jio.com/api/jio-numbermanagement-service/number/choicenumber/validate-otp",
        {
          otp: text
        },
        {
          headers: {
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Origin": "https://www.jio.com",
            "Referer": "https://www.jio.com/selfcare/choice-number/?action=preferred-number",
            "User-Agent": "Mozilla/5.0",
            "Cookie": users[userId].cookies?.join('; ')
          }
        }
      );

      // Success login
      users[userId].loggedIn = true;
      users[userId].step = null;

      ctx.reply("✅ Login successful!");

    } catch (err) {
      console.log(err.response?.data || err.message);
      ctx.reply("❌ Invalid OTP");
    }
  }
});


// =======================
// 🔒 PROTECTED COMMAND
// =======================

bot.command('data', (ctx) => {
  const user = users[ctx.from.id];

  if (!user || !user.loggedIn) {
    return ctx.reply("❌ Please login first using /start");
  }

  ctx.reply("🔥 You can now access Jio APIs!");
});


// =======================
// WEBHOOK (Render)
// =======================

app.use(bot.webhookCallback('/bot'));

bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/bot`);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});