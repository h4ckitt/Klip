const express = require("express")
const cors = require("cors")
const { createPdf } = require("./processors/processor_pdf")
const { createEpub } = require("./processors/processor_epub")
const { v7: uuidv7 } = require("uuid")
const path = require("path")
const fs = require("fs")
const fsPromises = require('fs').promises;

const app = express();
app.use(express.json());
app.use(cors())

const CLIPS_DIR = path.join(__dirname, "clips");
const DOWNLOAD_URL_PREFIX = process.env.DOWNLOAD_URL
if (!fs.existsSync(CLIPS_DIR)) {
    fs.mkdirSync(CLIPS_DIR, { recursive: true })
}

app.post('/clip', async(req, res) => {
    const {url, format = "epub", mode = "fast" } = req.body;

    const id = uuidv7();
    const extension = format === "pdf" ? "pdf" : "epub";
    const fileName = `${id}.${extension}`;
    const filePath = path.join(CLIPS_DIR, fileName);
    const fetchMode = mode === "fast" ? "fast" : "best_effort"

    console.log(`[${new Date().toISOString()}] Clipping (${format}): ${url}`);

    try {
        let title;
        if (format === "pdf") {
            title = await createPdf(url, filePath, fetchMode)
        } else {
            title = await createEpub(url, filePath, fetchMode)
        }

        res.json({
            success: true,
            id,
            title,
            file: fileName,
            timestamp: new Date().getTime()
        })
    } catch (err) {
        console.error("Clip Error:", err.message);
        res.status(500).json({ error: err.message });
    }
})

app.get('/sync', (req, res) => {
    try {
        const files = fs.readdirSync(CLIPS_DIR)

        const articles = files.
            filter(file => file.endsWith(".epub") || file.endsWith(".pdf"))
            .sort()
            .map(file => {
                return {
                    filename: file,
                    download_url: `${DOWNLOAD_URL_PREFIX}/${file}`,
                }
            });

        res.json(articles);
    } catch(err) {
        console.log("Sync Error: ", err)
        res.status(500).json({error: "Could not list files"})
    }
})

app.post('/clips/batch-delete', (req, res) => {
    const { filenames } = req.body;

    if (!filenames || !Array.isArray(filenames)) return res.status(400).json({error: "Invalid Payload"});

    res.status(202).send();

    (async() => {
        await Promise.all(filenames.map(async (file) => {
            const safeName = path.basename(file);
            const filePath = path.join(CLIPS_DIR, safeName);

            try {
                await fsPromises.unlink(filePath);
            } catch (err) {
                if (err.code !== 'ENOENT') console.error(`[Background Error] Failed to delete ${safeName}:`, err.message);
            }
        }))
    })();
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Klip Server active on http://localhost:${PORT}`);
});

