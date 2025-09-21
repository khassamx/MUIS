// commands/antilink.js
const { saveConfig } = require('../utils/configManager');

module.exports = {
    name: 'antilink',
    description: 'Activa o desactiva el antilink en un grupo.',
    async execute(sock, msg, args, isGroup, from, sender, config) {
        if (!isGroup) {
            return sock.sendMessage(from, { text: 'Este comando solo funciona en grupos.' });
        }

        const mode = (args[0] || 'off').toLowerCase();
        const kick = args.includes('kick');

        if (!config.groups[from]) {
            config.groups[from] = { antilink: false, antilinkKick: false };
        }

        config.groups[from].antilink = (mode === 'on');
        config.groups[from].antilinkKick = kick;
        await saveConfig(config);

        return sock.sendMessage(from, { text: `✅ Antilink ${mode === 'on' ? 'activado' : 'desactivado'}${kick ? ' (kick activado)' : ''}` });
    }
};