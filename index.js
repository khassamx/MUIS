// index.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser } = require('@adiwajshing/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const { loadConfig, saveConfig } = require('./utils/configManager');
const commands = require('./commands/index'); // Carga todos los comandos

const CONFIG_FILE = './michi_config.json';
let config = loadConfig(CONFIG_FILE);

// Función principal que inicia el bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`Usando Baileys v${version.join('.')}, última versión: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true, // Esto muestra el QR solo si es necesario (primera conexión).
        logger: pino({ level: 'silent' }),
    });

    // Maneja los eventos de la conexión
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log('Conexión cerrada. Intentando reconectar...');
                startBot();
            } else {
                console.log('¡Sesión cerrada! Borra la carpeta auth_info_multi y vuelve a escanear el QR.');
            }
        } else if (connection === 'open') {
            console.log('✅ ¡Bot conectado y listo!');
        }
    });

    // Maneja la actualización de las credenciales de sesión
    sock.ev.on('creds.update', saveCreds);

    // Maneja los mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || (msg.key && msg.key.remoteJid === 'status@broadcast')) return;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid);
            const text = (msg.message.conversation || msg.message?.extendedTextMessage?.text || '').trim();
            if (!text) return;

            // Prefijos de comandos
            const prefixes = ['!', '.', '/', '#'];
            if (!prefixes.some(p => text.startsWith(p))) return;
            const prefixUsed = prefixes.find(p => text.startsWith(p));
            const args = text.slice(prefixUsed.length).trim().split(/ +/);
            const cmd = args.shift().toLowerCase();

            // Llama al comando si existe en el objeto 'commands'
            if (commands[cmd]) {
                await commands[cmd].execute(sock, msg, args, isGroup, from, sender, config);
            }

        } catch (err) {
            console.error('Error manejando mensaje:', err);
        }
    });
}

startBot();