'use strict';

import alt from 'alt';
import rpc from 'altv-rpc';
import * as util from '../shared/util';

const fs        = require('fs');
const path      = require('path');
const http      = require('http');
const https     = require('https');
const ngrok     = require('ngrok');
const config    = require('./config.json');

rpc.init('altv-editor');

const url = config.useNgrok ? ngrok.connect(config.port) : getIpAddress().then(ip => `http://${ip}:${config.port}`);

function getIpAddress(){
    if(config.ip) return Promise.resolve(config.ip);

    return new Promise((resolve, reject) => {
        const req = https.get('https://api.ipify.org', res => {
            if(res.statusCode < 200 || res.statusCode > 299) return reject(res.statusCode);
            const body = [];
            res.on('data', chunk => body.push(chunk));
            res.on('end', () => resolve(body.join('')));
        });
        req.on('error', reject);
    });
}

http.createServer((req, res) => {
    let filePath = req.url.substr(1);
    if(!filePath) filePath = 'index.html';

    const extName = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.png': 'image/png',
        '.ts': 'text/plain'
    };

    res.writeHead(200, {
        'Content-Type': mimeTypes[extName],
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With'
    });

    fs.createReadStream(path.resolve(__dirname, 'static', filePath)).pipe(res);
}).listen(config.port);

console.log(`alt:V Editor is listening on port ${config.port}`);


// todo: allow some external control
rpc.register('canPlayerUse', (_, { player }) => {
    return (!Array.isArray(config.whitelistIPs) || config.whitelistIPs.includes(player.ip));
});

rpc.register('getInfo', (_, { player }) => url.then(url => {
    console.log(player.ip);
    return {
        url: player.ip === '127.0.0.1' ? `http://localhost:${config.port}` : url,
        key: config.key
    };
}));

rpc.register('eval', code => {
    try {
        util.evalInContext({
            alt,
            rpc
        }, code);
    }catch(e){}
});

rpc.register('evalClients', code => {
    const queue = alt.Player.all.map(player => rpc.callClient(player, 'eval', code));
    return Promise.all(queue);
});