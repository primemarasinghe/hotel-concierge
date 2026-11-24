FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are baked at build time.
# Leave NEXT_PUBLIC_API_URL empty so the client uses relative URLs,
# which are proxied through Next.js rewrites to the backend service.
# API_URL is server-side only — used by next.config.mjs rewrites, which are
# evaluated at build time in standalone mode. Must point to the Docker service name.
ENV API_URL=http://backend:8000
# NEXT_PUBLIC_API_URL is baked into the client bundle. Leave empty so the
# browser uses relative URLs, which Next.js proxies to the backend via rewrites.
ENV NEXT_PUBLIC_API_URL=""
ENV NEXTAUTH_URL=http://localhost:3001
ENV NEXTAUTH_SECRET=placeholder-replaced-at-runtime
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
