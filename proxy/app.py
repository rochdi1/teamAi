"""
proxy/app.py
Python Flask proxy for the VS Code extension's Docker backend.
Routes requests to the local Ollama container.

Usage:
  docker compose up -d
  python app.py
"""
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)
OLLAMA_URL = "http://ollama:11434/api/generate"

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    prompt = data.get("prompt", "")
    model = data.get("model", "llama3.1:3b-instruct-q4_K_M")
    options = data.get("options", {})

    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": model, "prompt": prompt, "stream": False, "options": options},
            timeout=30,
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)