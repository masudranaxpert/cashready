install:
	.venv/bin/python -m pip install -r requirements.txt
data:
	.venv/bin/python -m cashready.simulate
pipeline:
	.venv/bin/python scripts/run_pipeline.py
api:
	.venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port $$${PORT:-8000}
test:
	.venv/bin/python -m pytest tests/ -q
