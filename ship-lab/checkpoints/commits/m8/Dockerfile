# The Marlow FAQ service. Build it with:  npm run image:build   (it runs docker build with the git SHA, from the folder above this one)
FROM node:20.18-alpine3.20
WORKDIR /app
COPY engine ./engine
COPY service/package.json ./service/package.json
COPY service/src ./service/src
COPY service/data ./service/data
COPY service/config ./service/config
WORKDIR /app/service

# The git SHA is given at build time, and it is baked in twice: as a label on the image, and as GIT_SHA, which GET /version reports.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA NODE_ENV=production PORT=4000 HOST=0.0.0.0
LABEL org.opencontainers.image.revision=$GIT_SHA org.opencontainers.image.title="marlow-faq"

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/main.mjs"]
