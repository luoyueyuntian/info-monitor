FROM python:3.12-slim

WORKDIR /app

# Copy dependency spec first for better layer caching
COPY pyproject.toml ./

# Install Python dependencies only (not the package itself yet)
RUN pip install --no-cache-dir apscheduler sqlalchemy "psycopg[binary]"

# Copy source code
COPY src ./src

# Install the package (now source is available)
RUN pip install --no-cache-dir --no-deps .

CMD ["python", "-m", "info_monitor_scheduler.main"]
