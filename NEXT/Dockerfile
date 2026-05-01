# NEXUS Station — Docker Image
# Neural EXecution Universal System v2.0.0

FROM python:3.12-slim

LABEL maintainer="Zemskov Igor"
LABEL description="NEXUS Station AI — Space-themed AI development agent"

WORKDIR /station

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY pyproject.toml ./
RUN pip install --no-cache-dir \
    fastapi uvicorn pydantic python-multipart websockets httpx aiofiles

# Copy application
COPY src/ ./src/
COPY web/ ./web/
COPY run.py ./

# Set Python path
ENV PYTHONPATH=/station/src
ENV NEXUS_PORT=5600

EXPOSE 5600

CMD ["python", "run.py"]
