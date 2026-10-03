FROM oven/bun:1.3-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY rooms.ts index.ts tsconfig.json ./
ENV PORT=4455
EXPOSE 4455
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:4455/health || exit 1
USER bun
CMD ["bun", "run", "index.ts"]
