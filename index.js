// Michi-WaBot Creado por Noa 🐱
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');

const pino = require('pino');
const fs = require('fs-extra');
const ytdl = require('ytdl-core');
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');
const { Boom } = require('@hapi/boom');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando Baileys v${version.join('.')}, latest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: state.keys
    },
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }), // Silencia los logs de Baileys
  });

  sock.ev.on('creds.update', saveCreds);

  // Escuchar mensajes
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.remoteJid;
      const type = Object.keys(msg.message)[0];
      const body =
        type === 'conversation'
          ? msg.message.conversation
          : type === 'extendedTextMessage'
          ? msg.message.extendedTextMessage.text
          : '';

      if (!body) return;
      const command = body.trim().toLowerCase();

      // --- Comandos ---
      if (command === 'subbot' || command === '.subbot' || command === '#subbot') {
        await sock.sendMessage(from, { text: '🐱 Soy un SubBot activo creado por Noa!' });
      }

      if (command.startsWith('ytv ')) {
        const url = command.split(' ')[1];
        if (!ytdl.validateURL(url)) return sock.sendMessage(from, { text: '❌ URL no válida' });

        const file = path.join(os.tmpdir(), 'video.mp4');
        const stream = ytdl(url, { filter: 'videoandaudio' });
        const writeStream = fs.createWriteStream(file);
        stream.pipe(writeStream);

        writeStream.on('finish', async () => {
          await sock.sendMessage(from, {
            video: fs.readFileSync(file),
            caption: '🎥 Aquí tienes tu video!'
          });
          fs.unlinkSync(file);
        });
      }

      if (command.startsWith('playaudio ')) {
        const url = command.split(' ')[1];
        if (!ytdl.validateURL(url)) return sock.sendMessage(from, { text: '❌ URL no válida' });

        const file = path.join(os.tmpdir(), 'audio.mp3');
        const stream = ytdl(url, { filter: 'audioonly' });
        const writeStream = fs.createWriteStream(file);
        stream.pipe(writeStream);

        writeStream.on('finish', async () => {
          await sock.sendMessage(from, {
            audio: fs.readFileSync(file),
            mimetype: 'audio/mp4',
            ptt: true
          });
          fs.unlinkSync(file);
        });
      }

      if (command.startsWith('kick ')) {
        if (!msg.key.participant) return sock.sendMessage(from, { text: '⚠️ Solo en grupos!' });
        const number = command.split(' ')[1];
        if (!number) return sock.sendMessage(from, { text: '❌ Ingresa un número válido' });

        await sock.groupParticipantsUpdate(from, [`${number}@s.whatsapp.net`], 'remove');
        await sock.sendMessage(from, { text: `👢 Usuario ${number} expulsado!` });
      }

      if (command.includes('http://') || command.includes('https://')) {
        await sock.sendMessage(from, { delete: msg.key });
        await sock.sendMessage(from, { text: '⛔ Enlace detectado y eliminado (Antilink activo)' });
      }
    } catch (err) {
      console.error('Error en mensajes.upsert:', err);
    }
  });

  // Manejar desconexiones
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Desconectado. Razón:', lastDisconnect.error, ', reconectando:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Michi-WaBot conectado!');
    }
  });
}

startBot();
