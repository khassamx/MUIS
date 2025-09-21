// commands/setsms.js
const { saveConfig } = require('../utils/configManager');

module.exports = {
    name: 'setsms',
    description: 'Guarda tu número de teléfono para envíos SMS.',
    async execute(sock, msg, args, isGroup, from, sender, config) {
        const number = args[0];
        if (!number) {
            return sock.sendMessage(from, { text: 'Uso: setsms +59512345678' });
        }
        config.sms[sender] = number;
        await saveConfig(config);
        return sock.sendMessage(from, { text: `✅ Número SMS guardado para ${sender}: ${number}` });
    }
};