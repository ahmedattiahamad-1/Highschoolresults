FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create a non-root user for security (required by some platforms like Hugging Face)
RUN useradd -m myuser
USER myuser

# Expose port 7860 (Default for Hugging Face Spaces)
EXPOSE 7860

# Run gunicorn on port 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app", "--workers", "2", "--threads", "2", "--timeout", "120"]
