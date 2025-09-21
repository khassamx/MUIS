// index.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser, makeCacheableSignalKeyStore } = require('@adiwajshing/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs-extra');
const { loadConfig, saveConfig } = require('./utils/configManager');

const commands = {
  antilink: require('./commands/antilink'),
  help: require('./commands/help'),
  kick: require('./commands/kick'),
  playaudio: require('./commands/playaudio'),
  setsms: require('./commands/setsms'),
  subbot: require('./commands/subbot'),
  ytv: require('./commands/ytv')
};

const CONFIG_FILE = './michi_config.json';
let config = loadConfig(CONFIG_FILE);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`Usando Baileys v${version.join('.')}, última versión: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
  });

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

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      const msg = messages[0];
      if (!msg.message || (msg.key && msg.key.remoteJid === 'status@broadcast')) return;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid);
      const text = (msg.message.conversation || msg.message?.extendedTextMessage?.text || '').trim();
      if (!text) return;

      if (isGroup) {
        const groupConfig = config.groups[from] || { antilink: false, antilinkKick: false };
        if (groupConfig.antilink) {
          const hasLink = /https?:\/\/|wa\.me\//i.test(text);
          if (hasLink) {
            const groupMetadata = await sock.groupMetadata(from).catch(() => null);
            const participants = groupMetadata?.participants || [];
            const p = participants.find(p => jidNormalizedUser(p.id) === sender);
            if (!p?.admin) {
              if (groupConfig.antilinkKick) {
                await sock.groupParticipantsUpdate(from, [sender], 'remove');
                await sock.sendMessage(from, { text: `🔨 ${sender} expulsado por enviar enlaces (antilink activado).` });
                return;
              } else {
                await sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]} no se permiten enlaces en este grupo.`, mentions: [sender] });
                return;
              }
            }
          }
        }
      }

      const prefixes = ['!', '.', '/', '#'];
      if (!prefixes.some(p => text.startsWith(p))) return;
      const prefixUsed = prefixes.find(p => text.startsWith(p));
      const args = text.slice(prefixUsed.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();

      if (commands[cmd]) {
        await commands[cmd].execute(sock, msg, args, isGroup, from, sender, config);
        await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
      }
    } catch (err) {
      console.error('Error manejando mensaje', err);
    }
  });
}

startBot().catch(err => console.error('Falla al iniciar Michi-WaBot:', err));