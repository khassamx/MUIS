// qr_gen_2.js

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');
const pino = require('pino');
const { rmSync } = require('fs');

async function connectAndShowQR() {
  // Elimina la sesión anterior para empezar de cero
  rmSync('./auth_info_multi', { recursive: true, force: true });
  console.log('Sesión anterior eliminada. Preparando nuevo QR.');

  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');

  // Fuerza la instalación de una versión específica y estable de Baileys
  // Si esto falla, significa que la versión no existe o hay un problema de red
  console.log('Verificando la versión de Baileys...');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando Baileys v${version.join('.')}, última versión: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('¡Escanea el código QR para conectar tu bot!');
    }
    if (connection === 'close') {
      console.log('Conexión cerrada. Por favor, intenta de nuevo si el problema persiste.');
      process.exit();
    }
    if (connection === 'open') {
      console.log('✅ ¡Bot conectado y listo!');
    }
  });
}

connectAndShowQR();