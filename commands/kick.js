// commands/kick.js
const { jidNormalizedUser } = require('@adiwajshing/baileys');

module.exports = {
    name: 'kick',
    description: 'Expulsa participantes de un grupo.',
    async execute(sock, msg, args, isGroup, from) {
        if (!isGroup) {
            return sock.sendMessage(from, { text: 'Este comando solo funciona en grupos.' });
        }

        if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            return sock.sendMessage(from, { text: 'Menciona a las personas a expulsar: kick @user' });
        }

        const targets = msg.message.extendedTextMessage.contextInfo.mentionedJid;
        try {
            await sock.groupParticipantsUpdate(from, targets, 'remove');
            return sock.sendMessage(from, { text: `✅ Expulsados: ${targets.map(t => jidNormalizedUser(t).split('@')[0]).join(', ')}` });
        } catch (e) {
            console.error(e);
            return sock.sendMessage(from, { text: 'Error al expulsar. ¿El bot es admin?' });
        }
    }
};