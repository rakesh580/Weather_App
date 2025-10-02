# lightweight Python base
FROM python:3.9-slim  

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential curl git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install all Python deps
RUN pip install --no-cache-dir -r requirements.txt \
    torch==2.2.0+cpu torchvision==0.17.0+cpu torchaudio==2.2.0+cpu \
    -f https://download.pytorch.org/whl/cpu/torch_stable.html

COPY . .

EXPOSE 9000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]