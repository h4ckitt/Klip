FROM public.ecr.aws/docker/library/node:lts-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json .

RUN npm install --omit=dev

RUN mkdir -p clips

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]