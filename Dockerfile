FROM node:21
RUN npm i -g typescript

WORKDIR /app

RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y ca-certificates curl && install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
RUN echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

RUN apt-get update

COPY package*.json .
RUN npm ci
COPY . .
RUN tsc

CMD ["npm", "run", "start:prod"]