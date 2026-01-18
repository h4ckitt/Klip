const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const Epub = require('epub-gen');
const fs = require('fs');
const path = require('path');
const { launchBrowser, fetchHtml } = require("../utils/crawler")

async function generateCover(title, siteName, outputPath, browserInstance) {
    const page = await browserInstance.newPage();
    await page.setViewport({ width: 600, height: 800 });

    const coverHtml = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Lora:wght@700&family=Inter:wght@400&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0; padding: 0;
              background-color: #fbf0d9; /* Edge Sepia */
              color: #3b2e1e;
              display: flex; flex-direction: column;
              justify-content: center; align-items: center;
              height: 800px; width: 600px;
              border: 30px solid #3b2e1e;
              box-sizing: border-box; text-align: center;
            }
            .site {
              font-family: 'Inter', sans-serif;
              font-size: 22px; text-transform: uppercase;
              letter-spacing: 5px; margin-bottom: 40px; opacity: 0.7;
            }
            .title {
              font-family: 'Lora', serif;
              font-size: 44px; padding: 0 50px; line-height: 1.3;
            }
            .line {
              width: 100px; height: 3px; background: #3b2e1e; margin: 40px 0;
            }
          </style>
        </head>
        <body>
          <div class="site">${siteName || 'WEB ARTICLE'}</div>
          <div class="line"></div>
          <div class="title">${title}</div>
          <div class="line"></div>
        </body>
      </html>
    `;

    await page.setContent(coverHtml);
    await page.screenshot({ path: outputPath, type: 'jpeg', quality: 90 });
}

async function createEpub(url, outputFilePath, mode) {
    const browser = await launchBrowser()
    const fullHtml = await fetchHtml(url, mode, browser);
    const doc = new JSDOM(fullHtml, { url }); // Pass the URL for relative links/images
    const reader = new Readability(doc.window.document, {
        keepClasses: true,
        charThreshold: 20
    });
    const article = reader.parse();

    if (!article) throw new Error("Could not parse article.");

    const coverPath = path.join(__dirname, 'temp_cover.jpg');

    await generateCover(article.title, article.siteName, coverPath, browser);

    const kindleStyle = `
            body { 
                text-align: justify; 
                hyphens: auto; 
                -webkit-hyphens: auto;
                -moz-hyphens: auto;
                line-height: 1.6; 
                font-family: serif; 
            }
            
            p { 
                margin-bottom: 0.8em;
                text-indent: 0em; 
            }
            
            h1 { 
                text-align: left;  
                margin-bottom: 1em; 
            }
            
            img { 
                max-width: 100%; 
                height: auto; 
                display: block; 
                margin: 1em auto; 
            }
            
            blockquote { 
                border-left: 4px solid #eee; 
                padding-left: 1em; 
                font-style: italic; 
            }
               
            /* Block Code (Cleaned <pre> tags) */
            pre, .gist, .highlight {
                font-family: "Courier New", monospace !important;
                text-align: left !important;
                white-space: pre !important; /* Preserves the indentation we saved */
                word-wrap: normal !important;
                background: #f5f5f5 !important;
                padding: 10px 15px;
                display: block;
                margin: 1em 0;
                border-radius: 4px;
                line-height: 1.3 !important; /* Normal line height */
                font-size: 0.9em !important;
                color: #24292e !important; /* Default dark text */
            }

            /* Inline Code */
            p code, li code {
                font-family: "Courier New", monospace !important;
                white-space: normal !important;
                background: #f5f5f5 !important;
                padding: 2px 4px;
                display: inline !important;
                border-radius: 2px;
            }
            
            /* Syntax highlighting adjustments */
            .pl-k, .k { color: #d73a49 !important; font-weight: bold; }
            .pl-en, .nf { color: #6f42c1 !important; }
            .pl-s, .s { color: #032f62 !important; }
            .pl-c, .c { color: #6a737d !important; font-style: italic; }
            .pl-v, .nv { color: #e36209 !important; }
        `;

    const options = {
        title: article.title,
        author: article.byline || article.siteName || "Klip Reader",
        publisher: article.siteName || "Klip Reader",
        cover: coverPath,
        css: kindleStyle,
        content: [
            {
                title: article.title,
                data: article.content,
            }
        ]
    };

    await new Epub(options, outputFilePath).promise;
    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    return article.title
}

module.exports = { createEpub };
