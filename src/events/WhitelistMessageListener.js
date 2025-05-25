const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {

        if (message.author.bot) return;

        const blockedChannelId = process.env.WHITELIST_CHANNEL_ID;

        const bypassRoles = [
            '1345149010272456704',
            '1344934077597225044',
            '1345178774135902300',
            '1371313763688648868'
        ];

        if (message.channel.id !== blockedChannelId) return;

        const memberRoles = message.member.roles.cache;
        const hasBypass = bypassRoles.some(roleId => memberRoles.has(roleId));
        if (hasBypass) return;
        try {
            await message.delete();
        } catch (err) {
            if (err.code === 10008) {
                console.error(`Message does not exist: ${message.id}`);
            } else {
                console.error('Can\'t erase whitelist channel message:', err);
            }
        }
    },
};
