@echo off
cd /d %~dp0
set PYTHONPATH=%~dp0src;%PYTHONPATH%
if exist ".venv312\Scripts\python.exe" (
  ".venv312\Scripts\python.exe" -m voodoo_loader.main
) else if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -m voodoo_loader.main
) else (
  python -m voodoo_loader.main
)
pause
