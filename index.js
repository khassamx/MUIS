// Este script soluciona los problemas de conexión, reconexión y QR en Baileys.
// Usa useMultiFileAuthState para una gestión de sesión estable y sin necesidad de QR repetido.

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Función principal que inicia el bot
async function startBot() {
  // Carga o crea las credenciales de la sesión
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');

  // Obtiene la última versión de Baileys
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando Baileys v${version.join('.')}, última versión: ${isLatest}`);

  // Crea la instancia del bot
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // Esto muestra el QR solo si es necesario (primera conexión).
    logger: pino({ level: 'silent' }),
  });

  // Maneja los eventos de la conexión
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('Escanea el QR para conectar. (Esto solo pasará la primera vez)');
    }

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
    const m = messages[0];
    if (!m.message) return;

    const from = m.key.remoteJid;
    const type = Object.keys(m.message)[0];
    const text = type === 'conversation' ? m.message.conversation : '';
    const command = text.toLowerCase().trim();

    // --- Comandos de prueba ---

    if (command === 'setsms') {
      const contactName = m.pushName || 'Usuario';
      await sock.sendMessage(from, { text: `Hola ${contactName}, la autenticación con setsms ha sido exitosa.` });
      console.log(`Mensaje de setsms enviado a ${contactName}.`);
    }
    
    if (command === 'status') {
        const estado = sock.user.id ? 'conectado' : 'desconectado';
        await sock.sendMessage(from, { text: `Estado del bot: ${estado}.` });
    }
  });
}

// Inicia el bot
startBot();
