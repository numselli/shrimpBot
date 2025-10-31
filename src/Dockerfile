FROM node:24.10.0-alpine3.22
ENV NODE_ENV production

EXPOSE 8114

WORKDIR /app

RUN apk update && \
    apk add --update git && \
    apk add --update openssh 

COPY . /app

RUN npm install

CMD ["node", "index.mjs"]
