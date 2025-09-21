// commands/ytv.js
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

module.exports = {
    name: 'ytv',
    description: 'Descarga y envía un vídeo de YouTube.',
    async execute(sock, msg, args, isGroup, from) {
        const url = args[0];
        if (!url || !ytdl.validateURL(url)) {
            return sock.sendMessage(from, { text: 'Uso: ytv <url de YouTube>' });
        }

        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 \-_.]/g, '').slice(0, 40);
        const tmpFile = path.join(os.tmpdir(), `${title}.mp4`);
        const stream = ytdl(url, { filter: 'audioandvideo', quality: 'highestvideo' });
        const fileStream = fs.createWriteStream(tmpFile);
        stream.pipe(fileStream);

        await new Promise((res, rej) => {
            fileStream.on('finish', res);
            stream.on('error', rej);
        });

        await sock.sendMessage(from, { video: fs.createReadStream(tmpFile), caption: `🎬 ${info.videoDetails.title}` });
        await fs.remove(tmpFile);
    }
};