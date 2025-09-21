// Este script soluciona los problemas de conexión y reconexión en Baileys.
// Usa useMultiFileAuthState para una gestión de sesión más estable y segura.

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
  // 1. Carga o crea las credenciales de la sesión
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');

  // 2. Obtiene la última versión de Baileys
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Usando Baileys v${version.join('.')}, última versión: ${isLatest}`);

  // 3. Crea la instancia del bot
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // Esto muestra el QR en la terminal.
    logger: pino({ level: 'silent' }), // Silencia los logs internos para una salida más limpia
  });

  // 4. Maneja los eventos de la conexión
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('Escanea el QR para conectar.');
    }

    // Si la conexión se cerró
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (reason !== DisconnectReason.loggedOut) {
        console.log('Conexión cerrada. Intentando reconectar...');
        startBot(); // Llama a la función de nuevo para reconectar
      } else {
        console.log('¡Se cerró sesión! Borra la carpeta auth_info_multi y vuelve a escanear el QR.');
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
    const command = text.toLowerCase().trim();

    // --- Comandos básicos ---

    if (command === 'ping') {
      await sock.sendMessage(from, { text: 'Pong! 🏓' });
    }

    if (command === 'hola') {
      await sock.sendMessage(from, { text: '¡Hola! Soy un bot en Termux. ¿En qué puedo ayudarte? 😊' });
    }

    if (command === 'info') {
      await sock.sendMessage(from, { text: 'Este bot está corriendo en la última versión de Baileys en Termux.' });
    }
  });
}

// Inicia el bot
startBot();
