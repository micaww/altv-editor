'use strict';

import alt from 'alt';
import natives from 'natives';
import rpc from 'altv-rpc';
import { evalInContext } from '../shared/util.js';

rpc.init('altv-editor');

const STORAGE_KEY = 'altvEditorFiles';

let browser;
let visible = false;
let loaded = false;

function init(info){
    // set up browser
    browser = new alt.WebView(info.url);
    rpc.addWebView(browser);

    // set up key bind
    alt.on('keydown', key => {
        if (key === info.key) onBindPress();
    });
}

alt.on('resourceStart', () => {
    rpc.callServer('getInfo').then(info => {
        init(info);
    });
});

rpc.on('loaded', () => {
    alt.log('alt:V Editor loaded.');
    loaded = true;
});

alt.everyTick(() => {
    if (visible) {
        natives.disableAllControlActions(0);
    }
});

function onBindPress(){
    if(loaded){
        if(visible){
            alt.showCursor(false);
            setVisible(false);
            browser.unfocus();
        }else{
            getUserAccess().then(access => {
                if(access){
                    rpc.callBrowser(browser, 'setAccess', access);
                    alt.showCursor(true);
                    setVisible(true);
                    browser.focus();
                }
            });
        }
    }
}

function setVisible(show) {
    rpc.triggerBrowser(browser, 'setVisible', show);

    visible = show;
}

function getUserAccess(){
    return rpc.callServer('canPlayerUse').then(res => {
        if(typeof res === 'object'){
            return {
                l: !!res.l,
                s: !!res.s,
                c: !!res.c
            };
        }else return !!res;
    });
}

function focusEditor(){
    if(browser && browser.isVisible){
        rpc.triggerBrowser(browser, 'focus');
    }
}

rpc.register('eval', code => {
    try {
        evalInContext({
            alt,
            natives,
            rpc
        }, code);
    }catch(e){}
});

function getFiles() {
    const value = alt.LocalStorage.get().get(STORAGE_KEY);
    alt.logWarning('got storage: '+value);
    return value ? JSON.parse(value) : {};
}

function setFiles(files) {
    alt.logWarning('set storage: '+JSON.stringify(files));
    alt.LocalStorage.get().set(STORAGE_KEY, JSON.stringify(files));
}

rpc.register('getFiles', () => {
    const names = Object.keys(getFiles());
    return names.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
});
rpc.register('getFile', name => getFiles()[name]);
rpc.register('exists', name => typeof getFiles()[name] !== 'undefined');
rpc.register('saveFile', ([name, code]) => {
    const files = getFiles();

    files[name] = code;

    setFiles(files);
});
rpc.register('deleteFile', name => {
    const files = getFiles();

    delete files[name];

    setFiles(files);
});