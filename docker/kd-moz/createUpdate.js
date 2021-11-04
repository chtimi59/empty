const fs = require('fs')

const base = 'docker/kd-moz/www/'

async function main(ctx) {
    // ({github, context, core}) => ctx
    const manifest = JSON.parse(fs.readFileSync(base + 'manifest.json', 'utf8').toString());
    console.log(manifest.version)
    console.log("hi there!")
}

module.exports = main 
//main()