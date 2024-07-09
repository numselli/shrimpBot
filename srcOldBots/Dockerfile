FROM node:21.7.3-bookworm-slim

ENV NODE_ENV production

WORKDIR /app

RUN apt -y update && \
    apt -y install git

COPY . /app

RUN npm install

CMD ["node", "index.mjs"]