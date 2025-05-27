const { ChannelType, PermissionFlagsBits, ComponentType } = require('discord.js');
const { sendEmbedFromFile, sendEmbedReply } = require('../embeds/EmbedManager');

const lastCloseConfirmMessages = new Map();
const lastClosedMessages = new Map();

async function handleTicketButtons(interaction) {
    const { customId, user, guild, channel } = interaction;

    if (customId === 'create-ticket') {
        await interaction.deferReply({ flags: 64 });

        const safeUsername = user.username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const existing = guild.channels.cache.find(c =>
            c.name === `🎫︙ticket-${safeUsername}`
        );
        if (existing) {
            return interaction.editReply({
                content: '❌ Ya tienes un ticket abierto.',
                flags: 64
            });
        }

        try {
            const ticketChannel = await guild.channels.create({
                name: `🎫︙ticket-${safeUsername}`,
                type: ChannelType.GuildText,
                parent: process.env.TICKET_CATEGORY_ID,
                topic: user.username, // Guarda el username real (con puntos si los tiene)
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: process.env.SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            await sendEmbedFromFile(ticketChannel, 'ticket-support', {
                user_mention: `<@${user.id}>`,
                author_name: `@${user.username}`,
                author_iconURL: user.displayAvatarURL({ dynamic: true })
            });

            await interaction.editReply({
                content: `<:tickets:1376310446482788576> Ticket creado: ${ticketChannel}`,
                flags: 64
            });
        } catch (error) {
            console.error('❌ Error al crear el ticket:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al crear el ticket. Por favor, inténtalo de nuevo.',
                flags: 64
            });
        }
    }

    else if (customId === 'close-ticket') {
        const confirmMsg = await sendEmbedReply(interaction, 'ticket-confirmclose', {});
        if (!confirmMsg) return;

        lastCloseConfirmMessages.set(channel.id, confirmMsg.id);

        try {
            const confirmation = await confirmMsg.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id && ['confirm-close', 'cancel-close'].includes(i.customId),
                time: 5000
            });

            if (confirmation.customId === 'cancel-close') {
                await confirmation.deferUpdate();
                await confirmMsg.delete().catch(() => { });
                lastCloseConfirmMessages.delete(channel.id);
                return;
            }

            await confirmation.deferUpdate();
            lastCloseConfirmMessages.delete(channel.id);
            await confirmMsg.delete().catch(() => { });

            const trueUsername = channel.topic?.toLowerCase();
            const ticketOwner = trueUsername
                ? guild.members.cache.find(m => m.user.username.toLowerCase() === trueUsername)
                : null;

            if (ticketOwner) {
                await channel.permissionOverwrites.edit(ticketOwner.id, {
                    ViewChannel: false,
                    SendMessages: false
                });
            }

            const closedCategoryId = process.env.TICKET_CLOSED_CATEGORY_ID;
            if (closedCategoryId) {
                try {
                    await channel.setParent(closedCategoryId, { lockPermissions: false });
                } catch (err) {
                    console.warn('No se pudo mover el ticket a la categoría cerrada:', err.message);
                }
            }

            const closedMsg = await sendEmbedFromFile(channel, 'ticket-closed', {}, true);
            if (closedMsg) lastClosedMessages.set(channel.id, closedMsg.id);

        } catch (e) {
            await confirmMsg.delete().catch(() => { });
        }
    }

    else if (customId === 'reopen-ticket') {
        const trueUsername = channel.topic?.toLowerCase();
        const ticketOwner = trueUsername
            ? guild.members.cache.find(m => m.user.username.toLowerCase() === trueUsername)
            : null;

        if (ticketOwner) {
            await channel.permissionOverwrites.edit(ticketOwner.id, {
                ViewChannel: true,
                SendMessages: true
            });
        }

        const ticketCategoryId = process.env.TICKET_CATEGORY_ID;
        if (ticketCategoryId) {
            try {
                await channel.setParent(ticketCategoryId, { lockPermissions: false });
            } catch (err) {
                console.warn('No se pudo mover el ticket a la categoría original:', err.message);
            }
        }

        const closedMsgId = lastClosedMessages.get(channel.id);
        if (closedMsgId) {
            try {
                const msg = await channel.messages.fetch(closedMsgId);
                if (msg) await msg.delete();
            } catch (err) {
                console.warn('No se pudo borrar el mensaje de cierre:', err.message);
            }
        }

        await interaction.reply({ content: '🔓 El Ticket se ha vuelto a abrir.', flags: 64 });
    }

    else if (customId === 'delete-ticket') {
        const closedMsgId = lastClosedMessages.get(channel.id);
        if (closedMsgId) {
            try {
                const msg = await channel.messages.fetch(closedMsgId);
                if (msg) await msg.delete();
            } catch (err) {
                console.warn('No se pudo borrar el mensaje de cierre:', err.message);
            }
        }

        await interaction.reply({
            content: '<:tickets:1376310446482788576> Eliminando ticket en 5 segundos...',
            flags: 64
        });

        setTimeout(() => {
            channel.delete().catch(err =>
                console.warn('No se pudo eliminar el canal del ticket:', err.message)
            );
        }, 5000);
    }
}

module.exports = { handleTicketButtons };
