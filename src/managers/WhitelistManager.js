const mysql = require('mysql2');
require('dotenv').config();
const { sendEmbedFromFile } = require('.././embeds/EmbedManager');

// Crear un pool de conexiones con la base de datos
const db = mysql.createPool({
  host: process.env.WHITELIST_DB_HOST,
  user: process.env.WHITELIST_DB_USERNAME,
  password: process.env.WHITELIST_DB_PASSWORD,
  database: process.env.WHITELIST_DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función para agregar un jugador a la whitelist
function addPlayerToWhitelist(playerName, interaction) {
  return new Promise((resolve, reject) => {
    db.execute(
      "SELECT username FROM whitelist WHERE username = ?",
      [playerName],
      async (err, results) => {
        if (err) {
          console.error("Error querying the database:", err);
          reject("Hubo un error al verificar la whitelist.");
          return;
        }

        if (results.length > 0) {
          reject(`❌ Ese jugador ya se encuentra en la whitelist.`);
          return;
        }

        db.execute(
          "INSERT INTO whitelist (username) VALUES (?)",
          [playerName],
          async (err) => {
            if (err) {
              console.error("Error adding to database:", err);
              reject("❌ Hubo un error al agregar el jugador a la whitelist. Abre ticket para contactar al Staff.");
              return;
            }

            const channel = interaction.channel;

            // Envía el embed antes de resolver
            const embedError = await sendEmbedFromFile(channel, 'whitelist_success', {
              timestamp: new Date().toISOString(),
              author_name: `@${interaction.user.username}`,
              author_iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
              player_head: `https://mineskin.eu/helm/${playerName}.png`,
              player: `${playerName}`
            });

            if (embedError) {
              // Si hubo error enviando embed, se lo notificamos (pero igual resolvemos)
              resolve({
                message: `✅ El jugador ${playerName} ha sido agregado correctamente a la whitelist, pero no se pudo enviar el embed.`,
                embedSent: false,
              });
            } else {
              // Todo salió bien, embed enviado correctamente
              resolve({
                message: `✅ El jugador ${playerName} ha sido agregado correctamente a la whitelist.`,
                embedSent: true,
              });
            }
          }
        );
      }
    );
  });
}

module.exports = { addPlayerToWhitelist };