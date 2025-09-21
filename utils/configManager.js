// utils/configManager.js
const fs = require('fs-extra');
const CONFIG_FILE = './michi_config.json';

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return fs.readJsonSync(CONFIG_FILE);
    }
    return { sms: {}, subscribers: [], groups: {} };
}

async function saveConfig(config) {
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
}

module.exports = { loadConfig, saveConfig };