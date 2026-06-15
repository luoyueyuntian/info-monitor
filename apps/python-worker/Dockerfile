FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev musl-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency spec first for better layer caching
COPY pyproject.toml ./

# Install Python dependencies only (not the package itself yet)
RUN pip install --no-cache-dir \
      httpx feedparser beautifulsoup4 pydantic pandas sqlalchemy "psycopg[binary]"

# Copy source code
COPY src ./src

# Install the package (now source is available)
RUN pip install --no-cache-dir --no-deps .

CMD ["python", "-m", "info_monitor_worker.main"]
