FROM node:alpine

RUN set -ex \
 && apk add --no-cache suricata \
 && rm -fr /etc/suricata/rules \
 && chmod 644 /etc/suricata/*
COPY --chown=node:node . /app

WORKDIR /app
USER node
RUN set -ex \
 && npm install \
 && npm run build \
 && npm prune --production

EXPOSE 3000
CMD [ "npm", "start" ]
