const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const { launchBrowser, fetchHtml } = require("../utils/crawler")

async function createPdf(url, outputPath, mode) {
  const browser = await launchBrowser()
  const fullHtml = await fetchHtml(url, mode);
  const doc = new JSDOM(fullHtml, { url }); // Pass the URL for relative links/images
  const reader = new Readability(doc.window.document, {
    keepClasses: true,
    charThreshold: 20
  });
  const article = reader.parse();

  if (!article) {
    throw new Error('Failed to parse article content.');
  }

  const formattedHtml = `
      <html lang="en">
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap');

            body {
              background-color: #fbf0d9; /* Edge Sepia Background */
              color: #3b2e1e;            /* Soft Brown Text (Better for E-ink) */
              font-family: 'Lora', serif; /* High-quality book font */
              line-height: 1.6;
              margin: 0;
              padding: 0;
            }
            
            .content-wrapper {
              padding: 40px 50px;
            }

            h1 { 
              font-size: 32px; 
              line-height: 1.2; 
              color: #000; 
              margin-bottom: 10px;
              font-weight: 700;
            }

            .metadata {
              font-family: sans-serif;
              font-size: 14px;
              color: #705d42;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 30px;
              border-bottom: 1px solid #e5d8bc;
              padding-bottom: 10px;
            }

            /* Readability.js wraps content in a div, let's style its children */
            p { margin-bottom: 1.5em; font-size: 20px; }
            
            img { 
              max-width: 100%; 
              height: auto; 
              display: block; 
              margin: 30px auto;
              border-radius: 2px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            }

            blockquote {
              border-left: 4px solid #dcd0b5;
              padding-left: 20px;
              margin: 30px 0;
              font-style: italic;
              color: #5a4a35;
            }

            pre {
              background: #f1e6cc;
              padding: 15px;
              overflow-x: auto;
              font-size: 14px;
              border-radius: 5px;
              border: 1px solid #e5d8bc;
            }

            a { color: #3b2e1e; text-decoration: underline; }
            
            p, h1, h2, blockquote, pre, img {
                page-break-inside: avoid;
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
          </style>
        </head>
        <body>
          <div class="content-wrapper">
            <div class="metadata">${article.siteName || 'Article'} | ${article.byline || 'Read Now'}</div>
            <h1>${article.title}</h1>
            ${article.content}
          </div>
        </body>
      </html>
    `;

  const page = await browser.newPage();

  await page.setViewport({ width: 1264, height: 1680 });
  await page.setContent(formattedHtml, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    width: '1264px',
    height: '1680px',
    printBackground: true,
    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
  });

  return article.title;
}

module.exports = { createPdf };
