FROM node:12.16.1-alpine3.11

WORKDIR /opt/hivefeed/

COPY package.json package-lock.json LICENSE /opt/hivefeed/

RUN npm install

COPY app.js /opt/hivefeed/app.js
COPY lib/ /opt/hivefeed/lib/
COPY tools/ /opt/hivefeed/tools/
COPY README.md example.env config.example.json config.advanced.json /opt/hivefeed/

LABEL maintainer="Chris (Someguy123) - https://github.com/Someguy123"
LABEL git_repository="https://github.com/Someguy123/hivefeed-js"


VOLUME /opt/hivefeed/config.json

CMD ["sh", "-c", "npm start"]

