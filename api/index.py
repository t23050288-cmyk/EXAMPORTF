# Vercel Entry Point
import os
import sys

# Add the parent directory to sys.path so we can import from python_backend
api_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(api_dir)
backend_dir = os.path.join(project_root, "python_backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the app from our consolidated backend
from python_backend.main import app
