# Marks api/ as a package so `api._lib.*` / `api._routes.*` imports resolve
# from the project root (locally via uvicorn, and on Vercel). Subpackages are
# underscore-prefixed so Vercel deploys api/index.py as the only function.
