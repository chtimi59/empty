const fs = require('fs');
const path = require('path');
const https = require('https');

// dotenv
if (fs.existsSync(".env")) {
    fs.readFileSync(".env")
        .toString().split("\n")
        .map(l => l.split("=").map(v => v.trim()))
        .filter(e => e.length > 1)
        .forEach(([k,v]) => process.env[k]=v)
}

// global param
const param = {
    check_run_id: undefined,
    status: "queued",
    conclusion: undefined,
    github_url: "https://api.github.com/repos/chtimi59/empty/dispatches",
    github_token: process.env.GITHUB_TOKEN
};

function showUsage() {
    console.log(`
    Usage:
    
        node ${path.basename(__filename).replace(/.js$/, '')} [options] check_run_id
    
    Description:

        Send webHook event to trig a "checks_suite_update" on github

    Options:
        --help|-h: show usage
        --status: queued|in_progress
        --conclusion: cancelled|failure|success|neutral|skipped|timed_out
        --url: github api url
    `);
}

function error(msg) {
    if (msg) console.error(msg);
    process.exit(1);
}

async function main(argv) {
    if (argv.length === 0) {
        showUsage();
        error();
    }
    for (let i = 0; i < argv.length; i++) {
        const entry = argv[i].split('=');
        const name = entry[0];
        const arg = entry[1];
        do {
            if (name[0] !== '-') {
                param.check_run_id = name
                break;
            }
            if (name === '-h' || name === '--help') {
                showUsage();
                return true;
            }
            if (name === '--status') {
                if (![ "queued", "in_progress" ].includes(arg)) {
                    error("invalid status, queued|in_progress expected")
                }
                param.status = arg
                break;
            }
            if (name === '--conclusion') {
                if (![ "cancelled", "failure", "success", "neutral", "skipped", "timed_out" ].includes(arg)) {
                    error("invalid conclusion, cancelled|failure|success|neutral|skipped|timed_out expected")
                }
                param.status = "completed"
                param.conclusion = arg
                break;
            }
            if (name === '--url') {
                param.github_url = arg
                break;
            }
            showUsage();
            error(`unknown '${name}' option`);
        } while (0);
    }

    await run()
}

/** async HTTPRequest */
function httpsRequest(
    config,
    options = {
        token: undefined,
        data: undefined,
        valid: [200],
        debug: false,
    },
) {
    return new Promise((resolve, reject) => {
        options = {
            token: undefined,
            data: undefined,
            valid: [200],
            debug: false,
            ...options,
        };
        const requestConf = {
            method: 'POST',
            port: 443,
            hostname: '',
            path: '/',
            ...config,
        };
        const headers = {
            ...requestConf.headers,
        };
        if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
        requestConf.headers = headers;

        // TBC: content-lenght ?

        // stupid error that cost me half day (and maybe more! :())
        if (requestConf.path[0] != '/')
            reject(`path "${requestConf.path}" should starts with '/'}`);

        if (options.debug) {
            console.log(JSON.stringify(requestConf, null, 2));
            if (options.data != undefined) console.log("send data", options.data);
        }

        // actual request
        const req = https.request(requestConf, res => {
            if (options.debug) {
                console.log('response-http-status', res.statusCode);
                console.log('response-headers', JSON.stringify(res.headers, null, 2));
            }
            reporter = options.valid.includes(res.statusCode)
                ? resolve
                : reject;

            const body = [];
            res.on('data', body.push)
            res.on('end', () => {
                reporter({
                    data: Buffer.concat(body),
                    statusCode: res.statusCode,
                    headers: res.headers,
                });
            });
        });
        
        req.on('error', e => {
            const reqUrl = `https://${requestConf.hostname}:${requestConf.port}`
            reject(`httpsRequest(${reqUrl})\n${e}`);
        });

        if (options.data != undefined) req.write(options.data);
        req.end();
    });
}


async function run() {
    const url = new URL(param.github_url)
    if (!param.github_token) throw(new Error("GITHUB_TOKEN not defined"))
        
    console.log("send", param)
    
    const client_payload = {
        check_run_id: param.check_run_id,
        status: param.status,
        conclusion: param.conclusion
    }

    await httpsRequest(
        {
                method: 'POST',
                hostname: url.hostname,
                path: url.pathname,
                headers: {
                    "Accept": "application/vnd.github.everest-preview+json",
                    "User-Agent": "ghtash/1.0 (nodejs)",
                }
        }, {
                debug: true,
                token: param.github_token,
                valid: [200, 204],
                data: JSON.stringify({
                    event_type: "checks_suite_update",
                    client_payload
                })    
        })
        .catch(e => {
            throw(`github pushHook failed: ${e.statusCode || e} ${e.data}`)
        });
}

const [, , ...argv] = process.argv;
main(argv).catch(e => console.error(e));
