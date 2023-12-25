FROM node:21.5-bookworm-slim

ENV NODE_ENV production

EXPOSE 8114

WORKDIR /app

COPY . /app

RUN npm install

CMD ["node", "index.mjs"]