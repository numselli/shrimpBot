FROM node:18.11.0-alpine3.15

ENV NODE_ENV production

WORKDIR /app

COPY . /app

RUN npm install

CMD ["node", "index.mjs"]