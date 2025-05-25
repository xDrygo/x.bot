const { Client, GatewayIntentBits, Partials, ActivityType, Events } = require('discord.js');
const { registerCommands } = require('./commands');
const { handleInteraction } = require('./commands');
const { sendEmbedFromFile } = require('./embeds/EmbedManager');
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Follow me on https://github.com/xDrygo');
});

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
  ]
});
const whitelistMessageListener = require('./events/WhitelistMessageListener');
client.on(whitelistMessageListener.name, (...args) => whitelistMessageListener.execute(...args));
console.log('Listener cargado:', whitelistMessageListener);

client.on('ready', () => {
  console.log('Drygo Bot initialized.');
  client.user.setPresence({
    status: 'idle',
    activities: [{
      type: ActivityType.Custom,
      name: 'custom status',
      state: 'En Desarrollo. 🔧',
    }]
  });

  registerCommands(client);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand() || interaction.isAutocomplete()) {
    await handleInteraction(interaction);
  }
});

client.on('guildMemberAdd', member => {
  console.log(`New Member: ${member.user.tag}`);

  const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);

  if (!channel) {
    console.error('Can\'t find channel from env variables.');
    return;
  }
  sendEmbedFromFile(channel, 'welcome', {
    timestamp: new Date().toISOString(),
    author_name: `@${member.user.username}`,
    author_iconURL: member.user.displayAvatarURL({ dynamic: true }),
  });
});

client.login(process.env.TOKEN);