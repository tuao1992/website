FROM node:22-alpine

WORKDIR /app
COPY server.js package.json ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_FILE=/data/requests.json

# Mount a volume at /data so requests survive container restarts.
VOLUME /data

EXPOSE 3000
CMD ["node", "server.js"]
