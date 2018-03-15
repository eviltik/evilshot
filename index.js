const puppeteer = require("puppeteer")
const async = require('async');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');
const moment = require('moment');
const path = require('path');

const TIMEOUT_OPEN = 5000;

let scriptUrl = fs.readFileSync('./scripts/addUrlBanner.js').toString();
let urlsToScan = [];
let urls = [];
let browser;
let pages = [];
let stop = false;
let maxPages = 20;
let outDir = './report';
let viewPortSize = {
    width: 1024,
    height: 768
};

if (!argv.file && !argv.url) {
    console.log('Usage:');
    console.log('evilshot --url=http://bla.com [--out=./report] [--browser]');
    console.log('evilshot --urls=data/urls.csv [--out=./report] [--browser]');
    process.exit(1);
}


let puppeteerOptions = {
    args:[
        `--window-size=${ viewPortSize.width },${ viewPortSize.height }`
    ],
    headless: true,
    ignoreHTTPSErrors: true
}

if (typeof argv.browser === 'boolean') {
    puppeteerOptions.headless = !argv.browser;
}

outDir = argv.outdir || './report';

function urlToImageFile(url) {
    url = url.replace(/[:\/]/g,'-',url);
    url = url.replace(/\-+/,'-',url);
    let now = moment().format("-YYYY-MM-DD-HH-mm");
    let p = path.resolve(outDir+'/shots/');
    fs.ensureDirSync(p);
    p+='/'+url+now+'.png';
    return p;
}

function prepareUrlsToScan() {

    if (argv.url) {
        urls.push(argv.url);
    }

    if (argv.file) {
        urls = fs.readFileSync(argv.file).toString().split('\n');
    }

    let tmpUrl = [];

    for (let i = 0; i<urls.length; i++) {
        let url = urls[i];
        if (!url) continue;
        url = url.replace(/\t/g,' ');
        url = url.trim();
        if (!url) continue;
        if (url[0] === '#') continue;
        tmpUrl.push(url);
    }

    for (let i = 0; i<tmpUrl.length; i++) {
        let url = tmpUrl[i];
        let httpUrl = url;
        let httpsUrl = '';
        if (!url.match(/http/)) {
            httpUrl='http://'+url;
            httpsUrl = 'https://'+url;
        }
        urlsToScan.push(httpUrl);
        if (tmpUrl.length>1) urlsToScan.push(httpsUrl);
    }

    if (urlsToScan.length < maxPages) {
        maxPages = urlsToScan.length;
    }
}

function freePage() {
    for (let i = 0; i<maxPages; i++) {
        if (pages[i]) {
            if (!pages[i].currentUrl) {
                //console.log('return page %s', i);
                return pages[i];
            } else {
                //console.log('page %s already busy on %s', i, pages[i].currentUrl);
            }
        } else {
            //console.log('no object page %s', i);
        }
    }
    return null;
}


function prepagePages() {
    for (let i = 0; i<maxPages; i++) {
        browser
            .newPage()
            .then((p) => {
                /*
                p.on('console', msg => {
                    for (let i = 0; i < msg.args().length; ++i) {
                        console.log(p.currentUrl,`${i}: ${msg.args()[i]}`);
                    }
                });
                */

                p.on('dialog', async dialog => {
                    console.log(dialog.message())
                    await dialog.dismiss()
                });

                pages.push(p);
            })
    }

    setInterval(() => {
        shotUrls()
    }, 200);

};

function prepareBrowser() {

    puppeteer
        .launch(puppeteerOptions)
        .then((b) => {
            browser = b;

            browser.on('disconnected', () => {
                console.log('closing browser');
                stop = true;
            });

            prepagePages();
        })
}

function shotUrls() {

    let page = freePage();
    if (!page) {
        //console.log('shotUrls: no page available');
        return;
    }

    page.currentUrl = urlsToScan.shift();
    if (!page.currentUrl) {
        return;
    }

    async.series([
        (next) => {
            console.log("%s: opening page", page.currentUrl);
            page
                .goto(page.currentUrl, {
                    "timeout":TIMEOUT_OPEN,
                    "waitUntil" : "networkidle0"
                })
                .then(() => {
                    next();
                })
                .catch((e) => {
                    console.log("%s: error: %s", page.currentUrl, e.message);
                    delete page.currentUrl;
                    next(e);
                })
        },
        (next) => {
            if (!page.currentUrl) return next();
            //console.log("%s: setting viewport", page.currentUrl);
            page
                .setViewport(viewPortSize)
                .then(() => {
                    next();
                })
                .catch((e) => {
                    console.log("%s: error: %s", page.currentUrl, e.message);
                    next();
                })
        },
        (next) => {
            if (!page.currentUrl) return next();
            //console.log("%s: inject scriptUrl", page.currentUrl);
            let scriptUrlCopy = scriptUrl.replace(/\_\_URL\_\_/, page.currentUrl);
            page
                .addScriptTag({content:scriptUrlCopy})
                .then(() => {
                    next();
                })
                .catch((e) => {
                    console.log("%s: error: %s", page.currentUrl, e.message);
                    next();
                })
        },
        (next) => {
            if (!page.currentUrl) return next();
            let screenShotImage = urlToImageFile(page.currentUrl);
            //console.log("%s: screenshot! ", page.currentUrl);
            page
                .screenshot({path: screenShotImage})
                .then(() => {
                    next();
                })
                .catch((e) => {
                    console.log("%s: error: %s", page.currentUrl, e.message);
                    next();
                })
        },
        (next) => {
            if (!page.currentUrl) return next();
            //console.log("%s: wait ...", page.currentUrl);
            page
                .waitFor(500)
                .then(() => {
                    next();
                })
                .catch((e) => {
                    console.log("%s: error: %s", page.currentUrl, e.message);
                    next();
                })
        },
        (next) => {
            if (!page.currentUrl) return next();
            console.log("%s: done, freeing page", page.currentUrl);
            setTimeout(() => {
                delete page.currentUrl;
                next();
            }, 1000);
        }
    ], (err) => {

        if (err) {
            //console.log(err);
        }

        if (!urlsToScan.length) {
            console.log('all url done');
            browser
                .close()
                .then(() => {
                    process.exit();
                })
                .catch((e) => {
                    console.log(e);
                })
        }
    });

}


prepareUrlsToScan();
prepareBrowser();
