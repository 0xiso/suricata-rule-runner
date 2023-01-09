FROM node:14.3.0-alpine

RUN set -ex \
    && apk add --no-cache suricata \
    && rm -fr /etc/suricata/rules \
    && chmod 644 /etc/suricata/*
COPY --chown=node:node . /app

WORKDIR /app
RUN set -ex \
    && apk add --no-cache --virtual .gyp make g++ \
    && npm install \
    && npm run build \
    && npm prune --production \
    && apk del .gyp
USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD ["wget", "-q", "-O","/dev/null", "http://localhost:3000/"]
EXPOSE 3000
CMD [ "npm", "run", "start" ]