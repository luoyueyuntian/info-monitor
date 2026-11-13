FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Copy package metadata first, then source for installation.
COPY pyproject.toml ./
COPY src ./src

# Install the worker together with the dependencies declared in pyproject.toml.
RUN pip install --no-cache-dir .

CMD ["python", "-m", "info_monitor_worker.main"]
