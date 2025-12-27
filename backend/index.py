from app import create_app

app = create_app()

# Vercel requires 'app' to be the WSGI application
# This file serves as the entrypoint for Vercel deployment
