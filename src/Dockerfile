FROM node:24.0.1-alpine3.20
ENV NODE_ENV production

EXPOSE 8114

WORKDIR /app

RUN apk update && \
    apk add --update git && \
    apk add --update openssh 

COPY . /app

RUN npm install

CMD ["node", "index.mjs"]
