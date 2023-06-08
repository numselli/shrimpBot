FROM node:20.2.0-alpine3.17

ENV NODE_ENV production

EXPOSE 8114

WORKDIR /app

COPY . /app

RUN apk update && \
    apk add --update git && \
    apk add --update openssh

RUN npm install

CMD ["node", "index.mjs"]