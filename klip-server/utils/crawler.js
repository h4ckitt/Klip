const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

puppeteer.use(StealthPlugin())

let browser = null;

async function singletonBrowser() {
    if (browser) {
        return browser
    }

    browser = await launchBrowser()

    return launchBrowser()
}

async function launchBrowser() {
    return await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
}

async function fetchHtml(url, mode = 'fast', browserInstance = browser) {
    let browser = browserInstance;
    let isInternalBrowser = false;

    if (!browser) {
        browser = await launchBrowser();
        isInternalBrowser = true;
    }

    let page = null;

    try {
        page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();

            if (['font', 'media', 'stylesheet', 'other'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.mouse.move(100, 100);

        const waitCondition = mode === 'best_effort' ? 'networkidle2' : 'domcontentloaded';
        await page.goto(url, { waitUntil: waitCondition, timeout: 45000 }); // Bumped timeout slightly for images

        if (mode === 'best_effort') {
            await new Promise(r => setTimeout(r, 1000));
        }

        await page.evaluate(() => {
            const gists = document.querySelectorAll('.gist');
            gists.forEach(gist => {
                const codeLines = gist.querySelectorAll('.blob-code');
                if (codeLines.length > 0) {
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    let cleanHtml = '';
                    codeLines.forEach(line => { cleanHtml += line.innerHTML + '\n'; });
                    code.innerHTML = cleanHtml;
                    pre.appendChild(code);
                    gist.replaceWith(pre);
                }
            });

            document.querySelectorAll('figure').forEach(fig => {
                const figcaption = fig.querySelector('figcaption');
                const captionHtml = figcaption ? figcaption.innerHTML : '';


                let imgUrl = null;

                const noscript = fig.querySelector('noscript');
                if (noscript) {
                    const match = noscript.innerHTML.match(/src="([^"]+)"/);
                    if (match) imgUrl = match[1];
                }

                if (!imgUrl) {
                    const img = fig.querySelector('img');
                    if (img) {
                        // Priority: currentSrc > src > data-src > srcset
                        if (img.currentSrc) imgUrl = img.currentSrc;
                        else if (img.src && !img.src.startsWith('data:')) imgUrl = img.src;
                        else if (img.dataset.src) imgUrl = img.dataset.src;
                        else if (img.srcset) {
                            const parts = img.srcset.split(',');
                            imgUrl = parts[parts.length - 1].trim().split(' ')[0];
                        }
                    }
                }

                if (imgUrl) {
                    fig.innerHTML = '';

                    const newImg = document.createElement('img');
                    newImg.src = imgUrl;
                    newImg.style.maxWidth = '100%';
                    newImg.style.display = 'block';
                    newImg.style.margin = '0 auto';

                    fig.appendChild(newImg);

                    // Add the caption back
                    if (captionHtml) {
                        const newCap = document.createElement('figcaption');
                        newCap.innerHTML = captionHtml;
                        fig.appendChild(newCap);
                    }
                }
            });
        });

        return await page.content();

    } finally {
        if (page) await page.close();
        if (isInternalBrowser && browser) {
            await browser.close();
        }
    }
}

module.exports = { singletonBrowser , launchBrowser, fetchHtml };