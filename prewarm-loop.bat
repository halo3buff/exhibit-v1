@echo off
:loop
node src/pipeline/maintenance/prewarm-cache.mjs
echo Waiting 60 seconds before next run...
timeout /t 60
goto loop