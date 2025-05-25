const fs = require('fs');
const path = require('path');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function replacePlaceholders(text, variables) {
    if (typeof text !== 'string') return text;
    const replaced = text.replace(/%(\w+)%/g, (_, key) => variables[key] ?? `%${key}%`);
    return replaced.replace(/\\n/g, '\n');
}

const styleMap = {
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    danger: ButtonStyle.Danger,
    link: ButtonStyle.Link
};

/**
 * Envía un embed con componentes (botones) desde un archivo JSON.
 * 
 * @param {TextChannel|NewsChannel} channel
 * @param {string} embedId
 * @param {Object} [placeholders={}]
 * @param {boolean} [returnMessage=false]
 * @returns {Promise<Message|string|null>}
 */
async function sendEmbedFromFile(channel, embedId, placeholders = {}, returnMessage = false) {
    const embedsPath = path.resolve(__dirname, 'embeds.json');

    try {
        const fileContent = await fs.promises.readFile(embedsPath, 'utf8');
        const embeds = JSON.parse(fileContent);

        const data = embeds[embedId];
        if (!data) {
            const available = Object.keys(embeds).map(id => `• \`${id}\``).join('\n');
            return `❌ No se encontró un embed con la ID \`${embedId}\`.\n\n**Disponibles:**\n${available}`;
        }

        const embed = new EmbedBuilder();

        if (data.title) embed.setTitle(replacePlaceholders(data.title, placeholders));
        if (data.description) embed.setDescription(replacePlaceholders(data.description, placeholders));
        if (data.url) embed.setURL(replacePlaceholders(data.url, placeholders));
        if (data.color) embed.setColor(`#${data.color}`);
        embed.setTimestamp(placeholders.timestamp ? new Date(placeholders.timestamp) : new Date());

        if (data.footer?.text) {
            embed.setFooter({
                text: replacePlaceholders(data.footer.text, placeholders),
                iconURL: replacePlaceholders(data.footer.icon_url || '', placeholders)
            });
        }

        if (data.image?.url) {
            embed.setImage(replacePlaceholders(data.image.url, placeholders));
        }

        if (data.thumbnail?.url) {
            const replaced = replacePlaceholders(data.thumbnail.url, placeholders);
            if (replaced) embed.setThumbnail(replaced);
        }

        const author = {};
        if (data.author?.name) author.name = replacePlaceholders(data.author.name, placeholders);
        if (data.author?.icon_url) {
            const replaced = replacePlaceholders(data.author.icon_url, placeholders);
            if (replaced) author.iconURL = replaced;
        }
        if (data.author?.url) {
            const replaced = replacePlaceholders(data.author.url, placeholders);
            if (replaced) author.url = replaced;
        }
        if (Object.keys(author).length > 0) {
            embed.setAuthor(author);
        }

        if (Array.isArray(data.fields)) {
            embed.addFields(data.fields.map(f => ({
                name: replacePlaceholders(f.name, placeholders),
                value: replacePlaceholders(f.value, placeholders),
                inline: f.inline || false
            })));
        }

        const components = [];

        // Soporte para botones
        if (data.components?.buttons?.length > 0) {
            const row = new ActionRowBuilder();

            for (const btn of data.components.buttons) {
                const style = styleMap[btn.style?.toLowerCase()] ?? ButtonStyle.Secondary;
                const button = new ButtonBuilder()
                    .setLabel(replacePlaceholders(btn.label, placeholders))
                    .setStyle(style);

                if (style === ButtonStyle.Link) {
                    button.setURL(replacePlaceholders(btn.url, placeholders));
                } else {
                    button.setCustomId(replacePlaceholders(btn.custom_id, placeholders));
                }

                row.addComponents(button);
            }

            components.push(row);
        }

        const message = await channel.send({ embeds: [embed], components });
        return returnMessage ? message : null;
    } catch (err) {
        console.error('Failed on sending embed:', err);
        return '❌ Error al procesar o enviar el embed.';
    }
}

module.exports = { sendEmbedFromFile };
