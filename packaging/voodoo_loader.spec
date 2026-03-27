# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
import sys

project_root = Path(SPECPATH).resolve().parent
src_root = project_root / "src"
entrypoint = src_root / "voodoo_loader" / "main.py"
sounds_dir = src_root / "voodoo_loader" / "resources" / "sounds"

datas = []
if sounds_dir.exists():
    datas.append((str(sounds_dir), "voodoo_loader/resources/sounds"))

analysis = Analysis(
    [str(entrypoint)],
    pathex=[str(src_root)],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(analysis.pure)
is_windows = sys.platform.startswith("win")
# On Linux/macOS, keep executable name distinct from COLLECT folder name.
exe_name = "VoodooLoader" if is_windows else "VoodooLoader-bin"

exe = EXE(
    pyz,
    analysis.scripts,
    analysis.binaries,
    analysis.datas,
    [],
    name=exe_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    analysis.binaries,
    analysis.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="VoodooLoader",
)
