# Server Dockerfile - Production-ready Demucs Web Server
# Based on the demucs CLI Docker image but adds a web interface

# Start from the demucs base image
ARG BASE_IMAGE=xserrat/facebook-demucs:latest
FROM ${BASE_IMAGE}

USER root

# Set working directory for the server
WORKDIR /app

# Install system dependencies for python-magic
RUN apt update && apt install -y --no-install-recommends \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt /app/requirements.txt

# Upgrade pip first to ensure compatibility with latest packages
RUN python3 -m pip install --upgrade pip

# Install server dependencies
RUN python3 -m pip install -r /app/requirements.txt --no-cache-dir

# Copy server application code
COPY app/ /app/app/
COPY static/ /app/static/

# Create directories for job processing
RUN mkdir -p /tmp/demucs-jobs && chmod 777 /tmp/demucs-jobs

# Environment variables for the server
ENV FLASK_APP=app.server
ENV FLASK_ENV=production
ENV SERVER_PORT=8080
ENV MAX_UPLOAD_SIZE=104857600
ENV JOB_RETENTION_HOURS=1
ENV TORCH_HOME=/data/models
ENV OMP_NUM_THREADS=1

# Expose the server port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import requests; requests.get('http://localhost:8080/health', timeout=5)" || exit 1

# Override the entrypoint from the base image
ENTRYPOINT []

# Start the server
CMD ["python3", "-m", "app.server"]

