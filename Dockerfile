FROM node:12.16.1-alpine3.11

WORKDIR /opt/steemfeed/

COPY package.json package-lock.json LICENSE /opt/steemfeed/

RUN npm install

COPY app.js /opt/steemfeed/app.js
COPY lib/ /opt/steemfeed/lib/
COPY tools/ /opt/steemfeed/tools/
COPY README.md example.env config.example.json config.advanced.json /opt/steemfeed/

LABEL maintainer="Chris (Someguy123) - https://github.com/Someguy123"
LABEL git_repository="https://github.com/Someguy123/steemfeed-js"


VOLUME /opt/steemfeed/config.json

CMD ["sh", "-c", "npm start"]

