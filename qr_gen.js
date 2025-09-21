const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');
const pino = require('pino');
const { rmSync } = require('fs');

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
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  console.log('¡Escanea el código QR para conectar tu bot!');
}

connectAndShowQR();