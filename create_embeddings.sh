#!/usr/bin/env bash
set -e

python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

( cd docker && ./start-qdrant.sh )

python step1_scrape.py
python step2_chunkify.py
python step3_embeddings-save.py

