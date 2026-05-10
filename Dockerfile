FROM node:20 AS builder
WORKDIR /app
COPY src/frontend/ .
RUN npm install && npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/backend/ ./backend/
COPY --from=builder /app/dist ./frontend/dist
RUN mkdir -p data/uploads data/chroma
EXPOSE 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
