// Este script soluciona los problemas de conexión (error 405) en Baileys.
// Usa useMultiFileAuthState para una gestión de sesión más estable.

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

// Función principal que inicia el bot
async function startBot() {
  // 1. Carga o crea las credenciales de la sesión
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');

  // 2. Obtiene la última versión de Baileys
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando Baileys v${version.join('.')}, última versión: ${isLatest}`);

  // 3. Crea la instancia del bot
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }), // Silencia los logs internos de Baileys para una salida más limpia
  });

  // 4. Maneja los eventos de la conexión
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Si la conexión se cerró
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

      // Si el motivo no es que el usuario se desconectó manualmente
      if (reason !== DisconnectReason.loggedOut) {
        console.log('Conexión cerrada. Intentando reconectar...');
        startBot(); // Llama a la función de nuevo para reconectar
      } else {
        console.log('Desconectado. ¡Escanea el nuevo QR para volver a conectar!');
      }
    } else if (connection === 'open') {
      console.log('✅ ¡Bot conectado y listo!');
    }
  });

  // 5. Maneja la actualización de las credenciales
  sock.ev.on('creds.update', saveCreds);

  // 6. Maneja los mensajes
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;

    const from = m.key.remoteJid;
    const type = Object.keys(m.message)[0];
    const text = type === 'conversation' ? m.message.conversation : '';

    if (text.toLowerCase() === 'hola') {
      await sock.sendMessage(from, { text: '¡Hola! Soy tu bot, estoy funcionando perfectamente. 😊' });
    }
  });
}

// Inicia el bot
startBot();
