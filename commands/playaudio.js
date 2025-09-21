// commands/playaudio.js
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

module.exports = {
    name: 'playaudio',
    description: 'Envía un archivo de audio desde YouTube o local.',
    async execute(sock, msg, args, isGroup, from) {
        const target = args[0];
        if (!target) {
            return sock.sendMessage(from, { text: 'Uso: playaudio <url de YouTube> o playaudio local.mp3' });
        }

        if (ytdl.validateURL(target)) {
            const tmpFile = path.join(os.tmpdir(), `${Date.now()}.mp3`);
            const stream = ytdl(target, { filter: 'audioonly', quality: 'highestaudio' });
            const fileStream = fs.createWriteStream(tmpFile);
            stream.pipe(fileStream);

            await new Promise((res, rej) => {
                fileStream.on('finish', res);
                stream.on('error', rej);
            });

            await sock.sendMessage(from, { audio: fs.createReadStream(tmpFile), mimetype: 'audio/mpeg' });
            await fs.remove(tmpFile);
        } else if (fs.existsSync(target)) {
            await sock.sendMessage(from, { audio: fs.createReadStream(target), mimetype: 'audio/mpeg' });
        } else {
            return sock.sendMessage(from, { text: 'No es una URL válida ni un archivo local existente.' });
        }
    }
};