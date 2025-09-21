// commands/help.js
module.exports = {
    name: 'help',
    description: 'Muestra los comandos disponibles.',
    async execute(sock, msg, args, isGroup, from) {
        const help = `Michi WaBot - Creado por Noa\nComandos:\n.setsms +595... -> guardar tu número SMS\n.subbot subscribe|unsubscribe -> suscribirte a la lista\n.ytv <url> -> enviar video de YouTube\n.playaudio <url|archivo> -> enviar audio\n.kick @user -> expulsar (grupo)\n.antilink on|off [kick] -> activar antienlace en el grupo\n.help -> muestra este menú\n`;
        return sock.sendMessage(from, { text: help });
    }
};