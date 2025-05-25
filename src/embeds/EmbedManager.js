const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

/**
 * Reemplaza variables y secuencias especiales como \n en un string.
 * 
 * @param {string} text 
 * @param {Object} variables 
 * @returns {string}
 */
function replacePlaceholders(text, variables) {
    if (typeof text !== 'string') return text;

    const replaced = text.replace(/%(\w+)%/g, (_, key) => variables[key] ?? `%${key}%`);
    return replaced.replace(/\\n/g, '\n'); // Convertir '\n' string a salto de línea real
}

/**
 * Envía un embed al canal especificado, usando los datos del archivo embeds.json.
 * Permite reemplazo de variables y soporte para saltos de línea con \n.
 * 
 * @param {TextChannel|NewsChannel} channel - Canal al que se enviará el embed.
 * @param {string} embedId - ID del embed en el archivo JSON.
 * @param {Object} [placeholders={}] - Variables para reemplazo dinámico.
 * @returns {Promise<string|null>} - Mensaje de error o null si fue exitoso.
 */
async function sendEmbedFromFile(channel, embedId, placeholders = {}) {
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
        if (data.image?.url) embed.setImage(replacePlaceholders(data.image.url, placeholders));
        if (data.thumbnail?.url) {
            const replaced = replacePlaceholders(data.thumbnail.url, placeholders);
            if (replaced) {
                embed.setThumbnail(replaced);
            }
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

        await channel.send({ embeds: [embed] });
        return null;
    } catch (err) {
        console.error('Failed on sending embed:', err);
        return '❌ Error al procesar o enviar el embed.';
    }
}

module.exports = { sendEmbedFromFile };
