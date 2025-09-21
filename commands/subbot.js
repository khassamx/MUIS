// commands/subbot.js
const { saveConfig } = require('../utils/configManager');

module.exports = {
    name: 'subbot',
    description: 'Gestiona la suscripción a la lista de difusión del bot.',
    async execute(sock, msg, args, isGroup, from, sender, config) {
        const action = (args[0] || '').toLowerCase();
        if (action === 'subscribe' || action === 'sub') {
            if (!config.subscribers.includes(sender)) config.subscribers.push(sender);
            await saveConfig(config);
            return sock.sendMessage(from, { text: '✅ Te suscribiste a MichiWaBot.' });
        } else if (action === 'unsubscribe' || action === 'unsub') {
            config.subscribers = config.subscribers.filter(s => s !== sender);
            await saveConfig(config);
            return sock.sendMessage(from, { text: '✅ Te diste de baja de MichiWaBot.' });
        } else {
            return sock.sendMessage(from, { text: 'Uso: subbot subscribe|unsubscribe' });
        }
    }
};