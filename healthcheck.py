import os, urllib.request
port = os.environ.get("PORT", "8100")
urllib.request.urlopen(f"http://127.0.0.1:{port}/health")
