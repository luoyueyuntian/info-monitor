# Production Dockerfile for Info Monitor
# Frontend is built during image build in a dedicated builder stage.

FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Install dependencies with workspace metadata first for better layer caching.
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/api/package.json ./apps/api/
COPY packages/shared-contracts/package.json ./packages/shared-contracts/

RUN npm ci

# Copy only the files needed to build the frontend.
COPY apps/frontend ./apps/frontend
COPY packages/shared-contracts ./packages/shared-contracts

RUN npm run build --workspace @info-monitor/frontend


FROM node:22-alpine

# Install Python, curl, and build dependencies
RUN apk add --no-cache python3 py3-pip curl gcc python3-dev musl-dev

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-contracts/package.json ./packages/shared-contracts/

# Install production dependencies
RUN npm ci --omit=dev

# Copy API source
COPY apps/api/src ./apps/api/src

# Copy shared-contracts
COPY packages/shared-contracts/src ./packages/shared-contracts/src
COPY packages/shared-contracts/package.json ./packages/shared-contracts/

# Copy frontend dist from the builder stage
COPY --from=frontend-builder /app/apps/frontend/dist ./apps/frontend/dist

# Copy Python worker
COPY apps/python-worker/src ./apps/python-worker/src
COPY apps/python-worker/pyproject.toml ./apps/python-worker/

# Install Python dependencies (excluding playwright for Alpine)
RUN cd apps/python-worker && \
    python3 -m venv .venv && \
    .venv/bin/pip install --no-cache-dir \
      httpx feedparser beautifulsoup4 pydantic pandas sqlalchemy "psycopg[binary]" && \
    .venv/bin/pip install --no-cache-dir --no-deps . && \
    rm -rf .venv/lib/python*/site-packages/pip \
           .venv/lib/python*/site-packages/setuptools \
           .venv/lib/python*/site-packages/_distutils_hack

# Create .env file
RUN echo 'DATABASE_URL=postgresql://postgres:postgres@postgres:5432/info_monitor' > .env && \
    echo 'API_PORT=3001' >> .env && \
    echo 'HOST=0.0.0.0' >> .env && \
    echo 'CORS_ORIGIN=*' >> .env

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start command
CMD ["npx", "tsx", "apps/api/src/index.ts"]
