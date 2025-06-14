const { ChannelType, PermissionsBitField } = require('discord.js');
const { sendEmbedFromFile } = require('../embeds/EmbedManager');
require('dotenv').config();

class VoiceChannelManager {
    constructor(client) {
        this.client = client;
        this.guildId = process.env.VCM_GUILD_ID;
        this.creatorChannelId = process.env.VCM_CREATOR_CHANNEL_ID;
        this.categoryId = process.env.VCM_CATEGORY_ID || null;
        this.channelNameFormat = '🔊︙{user}';
        this.createdChannels = new Map();

        this.registerEvents();
    }

    registerEvents() {
        this.client.on('voiceStateUpdate', async (oldState, newState) => {
            if (newState.channelId === this.creatorChannelId) {
                await this.createPrivateChannel(newState);
            }

            if (oldState.channel && this.createdChannels.has(oldState.channelId)) {
                if (oldState.channel.members.size === 0) {
                    await oldState.channel.delete().catch(() => { });
                    this.createdChannels.delete(oldState.channelId);
                }
            }
        });
    }

    async createPrivateChannel(newState) {
        const guild = newState.guild;
        const member = newState.member;
        const category = this.categoryId
            ? guild.channels.cache.get(this.categoryId)
            : null;

        const channel = await guild.channels.create({
            name: this.channelNameFormat.replace('{user}', member.displayName),
            type: ChannelType.GuildVoice,
            parent: category?.id || null,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionsBitField.Flags.Connect],
                },
            ],
        }).catch(() => null);

        if (!channel) return;

        this.createdChannels.set(channel.id, member.id);

        await sendEmbedFromFile(channel, 'vc-create', {
            owner_mention: `<@${member.id}>`,
            author_name: `${member.displayName}`,
            author_iconURL: member.displayAvatarURL({ dynamic: true })
        });

        await member.voice.setChannel(channel).catch(() => { });
    }
}

module.exports = VoiceChannelManager;
