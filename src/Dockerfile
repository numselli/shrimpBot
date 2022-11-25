FROM node:18.11.0-alpine3.15

ENV NODE_ENV production

EXPOSE 8114

WORKDIR /app

COPY . /app

RUN npm install

CMD ["node", "index.mjs"]