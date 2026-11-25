# Build from the folder ABOVE this one (the image needs ../engine):
#   docker build -f service/Dockerfile --build-arg GIT_SHA=<sha> -t marlow-faq:<sha> .      (npm run image:build does this for you)
FROM node:20.18.0-alpine3.20

ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA
LABEL org.opencontainers.image.revision=$GIT_SHA

# 0.0.0.0, or a published port cannot reach the server in a container
ENV HOST=0.0.0.0 PORT=4000
WORKDIR /app/service

# only what runs: never the whole folder (it would carry .git and the logs into the image)
COPY --chown=node:node engine /app/engine
COPY --chown=node:node service/package.json ./package.json
COPY --chown=node:node service/src ./src
COPY --chown=node:node service/data ./data
COPY --chown=node:node service/config ./config
RUN mkdir -p logs && chown node:node logs

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/main.mjs"]
