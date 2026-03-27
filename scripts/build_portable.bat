@echo off
setlocal
cd /d %~dp0..

if exist ".venv312\Scripts\python.exe" (
  set PYEXE=.venv312\Scripts\python.exe
) else if exist ".venv\Scripts\python.exe" (
  set PYEXE=.venv\Scripts\python.exe
) else (
  set PYEXE=python
)

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build_portable.ps1 -PythonExe "%PYEXE%"
if errorlevel 1 exit /b 1

echo Portable build completed.
endlocal
