FROM node:21
RUN npm i -g typescript

WORKDIR /app

COPY package*.json .
RUN npm ci
COPY . .
RUN tsc

CMD ["npm", "run", "start:prod"]