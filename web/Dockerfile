# CashReady web — Next.js production image
FROM node:20-slim AS builder
WORKDIR /app
ENV INTERNAL_API_URL=http://api:8100
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV INTERNAL_API_URL=http://api:8100
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
