const fs = require('fs')

async function main(base_url, extension_id) {
    const manifest = JSON.parse(fs.readFileSync('docker/kd-moz/www/manifest.json', 'utf8').toString());
    const store = { "addons": { } }
    store.addons[extension_id] = {
        "updates": [
            {
              "version": manifest.version,
              "update_link": `${base_url}/firefox_extension.xpi`
            }
        ]
    }
    fs.writeFileSync('docker/kd-moz/www/update.json', JSON.stringify(store, null, 4))
}

module.exports = main 
//main("https://","{1234}")