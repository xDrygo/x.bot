const { ChannelType, PermissionFlagsBits, ComponentType } = require('discord.js');
const { sendEmbedFromFile } = require('.././embeds/EmbedManager');

const lastCloseConfirmMessages = new Map();
const lastClosedMessages = new Map();

async function handleTicketButtons(interaction) {
    const { customId, user, guild, channel } = interaction;

    if (customId === 'create-ticket') {
        const existing = guild.channels.cache.find(c => c.name === `🎫︙ticket-${user.username}`);
        if (existing) return interaction.reply({ content: '❌ Ya tienes un ticket abierto.', ephemeral: true });

        const ticketChannel = await guild.channels.create({
            name: `🎫︙ticket-${user.username}`,
            type: ChannelType.GuildText,
            parent: process.env.TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: process.env.SUPPORT_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        await sendEmbedFromFile(ticketChannel, 'ticket-support', {
            user_mention: `<@${user.id}>`,
            author_name: `@${user.username}`,
            author_iconURL: user.displayAvatarURL({ dynamic: true }),
        });

        await interaction.reply({
            content: `<:tickets:1376310446482788576> Ticket creado: ${ticketChannel}`,
            ephemeral: true
        });
    }

    else if (customId === 'close-ticket') {
        // Defiero la respuesta principal para evitar timeout de interacción
        await interaction.deferReply({ ephemeral: true });

        const confirmMsg = await sendEmbedFromFile(channel, "ticket-confirmclose", {}, true);
        if (confirmMsg) lastCloseConfirmMessages.set(channel.id, confirmMsg.id);

        try {
            const confirmation = await confirmMsg.awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: i =>
                    i.user.id === interaction.user.id &&
                    ['confirm-close', 'cancel-close'].includes(i.customId),
                time: 5000
            });

            if (confirmation.customId === 'cancel-close') {
                await confirmation.deferUpdate();
                await confirmMsg.delete().catch(() => { });
                await interaction.editReply({
                    content: `<:tickets:1376310446482788576> Cierre de ticket cancelado.`,
                    components: []
                });
                lastCloseConfirmMessages.delete(channel.id);
                return;
            }

            // Confirmado
            const userId = channel.name.split('-')[1];
            const ticketOwner = await guild.members.fetch(userId).catch(() => null);

            if (ticketOwner) {
                await channel.permissionOverwrites.edit(ticketOwner.id, {
                    ViewChannel: false,
                });
            }

            await confirmation.deferUpdate();
            await confirmMsg.delete().catch(() => { });

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

            await interaction.editReply({
                content: `<:tickets:1376310446482788576> Ticket cerrado.`,
                components: []
            });

            lastCloseConfirmMessages.delete(channel.id);

        } catch (e) {
            // Timeout
            await confirmMsg.delete().catch(() => { });

            await interaction.editReply({
                content: `<:tickets:1376310446482788576> ⏱️ Tiempo agotado. El ticket no se cerró.`,
                components: []
            });

            lastCloseConfirmMessages.delete(channel.id);
        }
    }

    else if (customId === 'reopen-ticket') {
        const userId = channel.name.split('-')[1];
        const member = await guild.members.fetch(userId).catch(() => null);

        if (member) {
            await channel.permissionOverwrites.edit(member.id, {
                ViewChannel: true,
                SendMessages: true,
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

        await interaction.reply({ content: '🔓 Ticket reabierto.', ephemeral: true });
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
            ephemeral: true
        });

        setTimeout(() => {
            channel.delete().catch(err =>
                console.warn('No se pudo eliminar el canal del ticket:', err.message)
            );
        }, 5000);
    }
}

module.exports = { handleTicketButtons };
