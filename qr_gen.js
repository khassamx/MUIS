const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');
const pino = require('pino');
const { rmSync } = require('fs');
const { Boom } = require('@hapi/boom');
const { DisconnectReason } = require('@adiwajshing/baileys');

async function connectAndShowQR() {
  // Elimina la sesión anterior para forzar la generación de un nuevo QR
  rmSync('./auth_info_multi', { recursive: true, force: true });
  console.log('Sesión anterior eliminada. Preparando nuevo QR.');

  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando Baileys v${version.join('.')}, última versión: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // Esto es lo que genera el código QR
    logger: pino({ level: 'silent' }), // Silencia los logs para una salida más limpia
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('¡Escanea el código QR para conectar tu bot!');
    }
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        // Si no es un logout, intentamos reconectar
        console.log('Conexión cerrada, intentando reconectar...');
        connectAndShowQR();
      } else {
        console.log('¡Sesión cerrada! Escanea un nuevo QR.');
      }
    }
    if (connection === 'open') {
      console.log('✅ ¡Bot conectado y listo!');
    }
  });
}

connectAndShowQR();