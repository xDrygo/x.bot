const { SlashCommandBuilder } = require('@discordjs/builders');
const { addPlayerToWhitelist } = require('./managers/WhitelistManager');
const { PermissionFlagsBits } = require('discord.js');
const { sendEmbedFromFile } = require('./embeds/EmbedManager');
const fs = require('fs');
const path = require('path');

// Función para registrar los comandos
async function registerCommands(client) {
  console.log('Registering commands...');

  // Obtén los comandos ya registrados
  const currentCommands = await client.application.commands.fetch();
  const commandNames = currentCommands.map(cmd => cmd.name);

  const commands = [
    new SlashCommandBuilder()
      .setName('whitelist')
      .setDescription('Agrega un nombre a la whitelist de Minecraft.')
      .addStringOption(option =>
        option.setName('nombre')
          .setDescription('El nombre de Minecraft para agregar a la whitelist.')
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName('sendembed')
      .setDescription('Envía un embed predefinido al canal especificado.')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Canal donde enviar el embed.')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('embedid')
          .setDescription('ID del embed a enviar desde embeds.json.')
          .setRequired(true)
          .setAutocomplete(true)),

    new SlashCommandBuilder()
      .setName('setup-tickets')
      .setDescription('Envía el panel para crear tickets')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Canal donde enviar el embed.')
          .setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  ];

  // Filtra los comandos para solo actualizar los que no están registrados
  const newCommands = commands.filter(cmd => !commandNames.includes(cmd.name));

  // Registra solo los nuevos comandos
  if (newCommands.length > 0) {
    await client.application.commands.set(newCommands);
    console.log(`Registered Commands: ${newCommands.map(cmd => cmd.name).join(', ')}`);
  } else {
    console.log('No new commands have been registered.');
  }

  console.log('Commands updated successfully.');
}

// Manejo de interacciones
async function handleInteraction(interaction) {

  // ✅ Autocompletado primero
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused();
    try {
      const embedsPath = path.resolve(__dirname, './embeds/embeds.json');
      const embeds = JSON.parse(await fs.promises.readFile(embedsPath, 'utf8'));

      const choices = Object.keys(embeds);
      const filtered = choices.filter(choice => choice.toLowerCase().includes(focused.toLowerCase()));


      await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice }))
      );
    } catch (err) {
      console.error('Autocomplete error:', err);
      await interaction.respond([]);
    }
    return;
  }

  // ✅ Comandos
  if (interaction.isCommand()) {
    const { commandName, options } = interaction;

    await interaction.deferReply({ flags: 64 });

    if (commandName === 'whitelist') {
      const nickname = options.getString('nombre').trim();

      try {
        const response = await addPlayerToWhitelist(nickname, interaction);

        if (response.embedSent) {
          // Embed ya enviado, no enviamos texto (no editamos con contenido vacío)
          // Puedes usar un caracter invisible para no romper la interacción:
          await interaction.deleteReply();
        } else {
          // No se envió embed, enviamos mensaje de texto normal
          await interaction.editReply({ content: response.message });
        }
      } catch (error) {
        console.error("Error in /whitelist:", error);
        await interaction.editReply({
          content: typeof error === 'string' ? error : "❌ Ocurrió un error al procesar tu solicitud. Abre ticket para contactar al Staff."
        });
      }
    }

    if (commandName === 'sendembed') {
      const channel = options.getChannel('channel');
      const embedId = options.getString('embedid');

      const error = await sendEmbedFromFile(channel, embedId);
      if (error) {
        await interaction.editReply({ content: error });
      } else {
        await interaction.editReply({ content: `✅ Embed enviado a ${channel}.` });
      }
    }

    if (commandName === 'setup-tickets') {
      const channel = options.getChannel('channel');

      const error = await sendEmbedFromFile(channel, "ticket-open");
      if (error) {
        await interaction.editReply({ content: error });
      } else {
        await interaction.editReply({ content: `✅ Ticket Embed enviado a ${channel}.` });
      }
    }
  }
}


module.exports = { registerCommands, handleInteraction };
