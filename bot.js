require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Simple route (Render needs this)
app.get('/', (req, res) => {
  res.send('Bot is running 🚀');
});

// Sample command
bot.start((ctx) => {
  ctx.reply('👋 Welcome! Send /premium to test license system');
});

// Fake license check
const licensedUsers = new Set();

bot.command('premium', (ctx) => {
  if (!licensedUsers.has(ctx.from.id)) {
    return ctx.reply('❌ You are not licensed. Send /activate');
  }
  ctx.reply('🔥 Premium feature unlocked!');
});

// Activate license (demo)
bot.command('activate', (ctx) => {
  licensedUsers.add(ctx.from.id);
  ctx.reply('✅ License activated!');
});

// Webhook setup
const PORT = process.env.PORT || 3000;

app.use(bot.webhookCallback('/bot'));

bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/bot`);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});