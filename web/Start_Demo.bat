@echo off
rem Starts the CleanPinkCity demo: a local server for this folder, then opens it in the browser.
rem Keep this window open during the presentation; close it (or press Ctrl+C) to stop the server.
cd /d "%~dp0"
echo Starting CleanPinkCity on http://localhost:8000 ...
start "" http://localhost:8000
python -m http.server 8000
