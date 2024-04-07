FROM node:21.7.2-bookworm-slim

ENV NODE_ENV production

EXPOSE 8114

WORKDIR /app

RUN apt -y update && \
    apt -y install git

COPY . /app

RUN npm install

CMD ["node", "index.mjs"]