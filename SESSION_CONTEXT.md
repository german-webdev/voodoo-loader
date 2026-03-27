# Voodoo Loader - Session Context

Updated: 2026-03-28
Project root: `F:\AI\p-m\hf_aria2_downloader_gui`

## 1) Р§С‚Рѕ СЌС‚Рѕ Р·Р° РїСЂРѕРµРєС‚

`Voodoo Loader` вЂ” Windows desktop GUI downloader РїРѕРІРµСЂС… `aria2c`.
Р¦РµР»СЊ: Р±С‹СЃС‚СЂС‹Рµ, РІРѕР·РѕР±РЅРѕРІР»СЏРµРјС‹Рµ, РѕС‡РµСЂРµРґРЅС‹Рµ Р·Р°РіСЂСѓР·РєРё РїРѕ **Р»СЋР±С‹Рј РїСЂСЏРјС‹Рј СЃСЃС‹Р»РєР°Рј** (РЅРµ С‚РѕР»СЊРєРѕ Hugging Face) СЃ СѓРґРѕР±РЅС‹Рј UX, Р»РѕРєР°Р»РёР·Р°С†РёРµР№ RU/EN Рё Р±РµР·РѕРїР°СЃРЅРѕР№ РѕР±СЂР°Р±РѕС‚РєРѕР№ СЃРµРєСЂРµС‚РѕРІ.

Р“Р»Р°РІРЅС‹Р№ РёСЃС‚РѕС‡РЅРёРє С‚СЂРµР±РѕРІР°РЅРёР№: `PRD.md`.

## 2) Р§С‚Рѕ СЃС‡РёС‚Р°С‚СЊ source of truth

1. `PRD.md` вЂ” РїСЂРѕРґСѓРєС‚РѕРІС‹Рµ С‚СЂРµР±РѕРІР°РЅРёСЏ Рё РїСЂРёРѕСЂРёС‚РµС‚С‹.
2. `CODEX.md` вЂ” РёРЅР¶РµРЅРµСЂРЅС‹Рµ РїСЂРёРЅС†РёРїС‹ Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ.
3. `CODEX_IMPLEMENTATION_GUIDE.md` вЂ” РїР°Р№РїР»Р°Р№РЅ СЂР°Р·СЂР°Р±РѕС‚РєРё (РјРѕРґСѓР»Рё, С‚РµСЃС‚С‹, СЌС‚Р°РїРЅРѕСЃС‚СЊ).
4. Р­С‚РѕС‚ С„Р°Р№Р» (`SESSION_CONTEXT.md`) вЂ” РѕРїРµСЂР°С‚РёРІРЅС‹Р№ РєРѕРЅС‚РµРєСЃС‚ РґР»СЏ РїСЂРѕРґРѕР»Р¶РµРЅРёСЏ СЃРµСЃСЃРёР№.

## 3) Р’Р°Р¶РЅС‹Рµ РґРѕРіРѕРІРѕСЂС‘РЅРЅРѕСЃС‚Рё

- Р Р°Р±РѕС‡РµРµ РЅР°Р·РІР°РЅРёРµ Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅРѕ: **Voodoo Loader**.
- Legacy MVP С„Р°Р№Р»С‹ РІ РєРѕСЂРЅРµ (РЅР°РїСЂРёРјРµСЂ, СЃС‚Р°СЂС‹Р№ `voodoo_loader_app.py`) **РЅРµ СЏРІР»СЏСЋС‚СЃСЏ Р°СЂС…РёС‚РµРєС‚СѓСЂРЅРѕР№ Р±Р°Р·РѕР№**.
- РџР°СЂР°Р»Р»РµР»РёР·Рј РѕС‡РµСЂРµРґРё: `max_concurrent_downloads = 0` РѕР·РЅР°С‡Р°РµС‚ **Р±РµР· РѕРіСЂР°РЅРёС‡РµРЅРёР№**.
- РЎРµРєСЂРµС‚С‹ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ **РЅРµ СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ**, С‚РѕР»СЊРєРѕ СЏРІРЅС‹Р№ opt-in С‡РµСЂРµР· С‡РµРєР±РѕРєСЃС‹.

## 4) РўРµРєСѓС‰РµРµ СЃРѕСЃС‚РѕСЏРЅРёРµ СЂРµР°Р»РёР·Р°С†РёРё (С„Р°РєС‚)

## 4.1 РђСЂС…РёС‚РµРєС‚СѓСЂР°

РђРєС‚СѓР°Р»СЊРЅР°СЏ modular-СЃС‚СЂСѓРєС‚СѓСЂР° (СЂР°Р±РѕС‡Р°СЏ):

- `src/voodoo_loader/main.py`, `app.py`, `main_window.py`
- `models/` (`AppSettings`, `QueueItem`, `DownloadOptions`, ...)
- `services/` (`aria2_service`, `aria2_provisioning_service`, `settings_service`, `localization_service`)
- `parsers/aria2_output_parser.py`
- `widgets/settings_dialog.py`
- `tests/` (40 С‚РµСЃС‚РѕРІ)

## 4.2 Р¤СѓРЅРєС†РёРѕРЅР°Р»СЊРЅРѕ СѓР¶Рµ СЃРґРµР»Р°РЅРѕ

- РЈРЅРёРІРµСЂСЃР°Р»СЊРЅР°СЏ РѕС‡РµСЂРµРґСЊ СЃСЃС‹Р»РѕРє (РґРѕР±Р°РІР»РµРЅРёРµ РІРѕ РІСЂРµРјСЏ Р°РєС‚РёРІРЅРѕР№ Р·Р°РіСЂСѓР·РєРё).
- Batch import `.txt`.
- РџСЂРёРѕСЂРёС‚РµС‚С‹ РѕС‡РµСЂРµРґРё: move up/down/top/bottom.
- Retry selected / retry all failed-canceled.
- Remove selected / remove failed-canceled.
- РљРѕРЅС‚РµРєСЃС‚РЅРѕРµ РјРµРЅСЋ + РіРѕСЂСЏС‡РёРµ РєР»Р°РІРёС€Рё РґР»СЏ queue-РѕРїРµСЂР°С†РёР№.
- РќР°СЃС‚СЂРѕР№РєР° concurrency РІ Settings (`0 = unlimited`).
- РџСЂРѕРіСЂРµСЃСЃ + РјРµС‚Р°РґР°РЅРЅС‹Рµ: current item, downloaded/total, remaining, speed, ETA.
- РЈР»СѓС‡С€РµРЅРЅС‹Рµ error hints (401/403, 404, DNS, timeout, 429, 503, disk, perms, TLS Рё С‚.Рґ.).
- РЎРѕС…СЂР°РЅРµРЅРёРµ СЃРѕСЃС‚РѕСЏРЅРёСЏ РѕРєРЅР° Рё С€РёСЂРёРЅ РєРѕР»РѕРЅРѕРє queue.
- Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РЅРµР·Р°РІРµСЂС€С‘РЅРЅРѕР№ РѕС‡РµСЂРµРґРё РјРµР¶РґСѓ Р·Р°РїСѓСЃРєР°РјРё.
- `aria2c` detection + auto-bootstrap (РµСЃР»Рё РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ Р±РёРЅР°СЂСЊ).
- РљРѕРјР°РЅРґРЅС‹Р№ preview СЃ РјР°СЃРєРёСЂРѕРІРєРѕР№ СЃРµРєСЂРµС‚РѕРІ.
- RU/EN Р»РѕРєР°Р»РёР·Р°С†РёСЏ СЃ РїРµСЂРµРєР»СЋС‡РµРЅРёРµРј РІ РїСЂРёР»РѕР¶РµРЅРёРё.

## 4.3 Authentication UX (РїРѕСЃР»РµРґРЅРёРµ РёС‚РµСЂР°С†РёРё)

РЎРґРµР»Р°РЅРѕ РїРѕР»РЅРѕС†РµРЅРЅРѕ:

- Collapsible auth section (РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ СЃРІРµСЂРЅСѓС‚Р°).
- Р РµР¶РёРјС‹ Р°РІС‚РѕСЂРёР·Р°С†РёРё:
  - `No auth`
  - `Token + headers`
  - `Login/password`
- Р”РёРЅР°РјРёС‡РµСЃРєРёР№ РїРѕРєР°Р· РЅСѓР¶РЅС‹С… РїРѕР»РµР№ РїРѕ СЂРµР¶РёРјСѓ.
- РџРѕРґСЃРєР°Р·РєРё (help text) РїРѕ РІС‹Р±СЂР°РЅРЅРѕРјСѓ auth mode.
- `Show token` Рё `Show password`.
- Р’Р°Р»РёРґР°С†РёСЏ РїРµСЂРµРґ Start/Preview:
  - token-mode: РЅСѓР¶РµРЅ token РёР»Рё С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ header
  - basic-mode: РЅСѓР¶РЅС‹ username + password
- Opt-in СЃРѕС…СЂР°РЅРµРЅРёРµ СЃРµРєСЂРµС‚Р°:
  - `Remember token`
  - `Remember username`
- РЎРѕС…СЂР°РЅРµРЅРёРµ `auth_mode` РІ settings + РѕР±СЂР°С‚РЅР°СЏ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚СЊ СЃРѕ СЃС‚Р°СЂС‹РјРё settings.

## 4.4 Security СЃРѕСЃС‚РѕСЏРЅРёРµ

- Р’ Р»РѕРіР°С… Рё preview С‚РѕРєРµРЅ РјР°СЃРєРёСЂСѓРµС‚СЃСЏ.
- РЎРµРєСЂРµС‚С‹ РЅРµ РїРµСЂСЃРёСЃС‚СЏС‚СЃСЏ Р±РµР· opt-in.
- Р’ portable-СЂРµР¶РёРјРµ settings С…СЂР°РЅСЏС‚СЃСЏ РІ plaintext JSON СЂСЏРґРѕРј СЃ exe (СЌС‚Рѕ СЏРІРЅРѕ Р·Р°РґРѕРєСѓРјРµРЅС‚РёСЂРѕРІР°РЅРѕ).

## 5) РљР°С‡РµСЃС‚РІРѕ/РїСЂРѕРІРµСЂРєРё

РџРѕСЃР»РµРґРЅРёР№ СЃС‚Р°Р±РёР»СЊРЅС‹Р№ РїСЂРѕРіРѕРЅ:

- `ruff` вЂ” passed
- `mypy` вЂ” passed
- `pytest` вЂ” **43 passed**

## 6) Portable build (СѓР¶Рµ РіРѕС‚РѕРІ)

РЎРґРµР»Р°РЅР° Рё РїСЂРѕРІРµСЂРµРЅР° СЃР±РѕСЂРєР° portable С‡РµСЂРµР· PyInstaller.

Build-С„Р°Р№Р»С‹:

- `packaging/voodoo_loader.spec`
- `scripts/build_portable.ps1`
- `scripts/build_portable.bat`

РђСЂС‚РµС„Р°РєС‚С‹ СЃР±РѕСЂРєРё:

- `dist/portable/VoodooLoader/VoodooLoader.exe`
- `dist/portable/VoodooLoader-portable.zip`

## 7) РљР°Рє Р±С‹СЃС‚СЂРѕ РїСЂРѕРґРѕР»Р¶РёС‚СЊ СЂР°Р±РѕС‚Сѓ РІ СЃР»РµРґСѓСЋС‰РµР№ СЃРµСЃСЃРёРё

## 7.1 РњРёРЅРёРјР°Р»СЊРЅС‹Р№ СЃС‚Р°СЂС‚РѕРІС‹Р№ С‡РµРє-Р»РёСЃС‚

1. РћС‚РєСЂС‹С‚СЊ Рё РїСЂРѕС‡РёС‚Р°С‚СЊ:
   - `PRD.md`
   - `SESSION_CONTEXT.md`
2. Р—Р°РїСѓСЃС‚РёС‚СЊ quality checks:
   - `ruff`
   - `mypy`
   - `pytest`
3. РўРѕР»СЊРєРѕ Р·Р°С‚РµРј Р±СЂР°С‚СЊ СЃР»РµРґСѓСЋС‰РёР№ РїСѓРЅРєС‚ РёР· backlog.

## 7.2 РљРѕРјР°РЅРґС‹

```powershell
$env:PYTHONPATH="$PWD\src"
.\.venv312\Scripts\python.exe -m ruff check src tests
.\.venv312\Scripts\python.exe -m mypy src/voodoo_loader
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
.\.venv312\Scripts\python.exe -m pytest tests -q -p no:cacheprovider -p no:tmpdir
```

Р—Р°РїСѓСЃРє РїСЂРёР»РѕР¶РµРЅРёСЏ:

```powershell
$env:PYTHONPATH="$PWD\src"
.\.venv312\Scripts\python.exe -m voodoo_loader.main
```

РЎР±РѕСЂРєР° portable:

```powershell
scripts\build_portable.ps1
```

## 8) РџСЂРёРѕСЂРёС‚РµС‚РЅС‹Р№ backlog (СЃР»РµРґСѓСЋС‰РёРµ С€Р°РіРё)

1. Manual QA portable-Р°СЂС‚РµС„Р°РєС‚Р° РЅР° В«С‡РёСЃС‚РѕР№В» РјР°С€РёРЅРµ/РїСЂРѕС„РёР»Рµ:
   - first run
   - aria2 bootstrap
   - queue lifecycle
   - exit behavior
2. (РћРїС†РёРѕРЅР°Р»СЊРЅРѕ) RPC mode РїРѕРІРµСЂС… aria2 daemon.
3. (Р’Р°Р¶РЅРѕ РґР»СЏ security roadmap) РџРµСЂРµРЅРѕСЃ С…СЂР°РЅРµРЅРёСЏ СЃРµРєСЂРµС‚РѕРІ РёР· plaintext РІ OS secure store.
4. (РћРїС†РёРѕРЅР°Р»СЊРЅРѕ) Installer-РІРµСЂСЃРёСЏ РєР°Рє secondary distribution.
5. UX-РїРѕР»РёС€/Р»РѕРєР°Р»РёР·Р°С†РёРѕРЅРЅС‹Р№ pass РїРѕ РѕСЃС‚Р°РІС€РёРјСЃСЏ СЃС‚Р°С‚РёС‡РµСЃРєРёРј Р°РЅРіР»РѕСЏР·С‹С‡РЅС‹Рј СЃС‚СЂРѕРєР°Рј РІ UI.

## 9) Р§С‚Рѕ РќР• РґРµР»Р°С‚СЊ

- РќРµ РІРѕР·РІСЂР°С‰Р°С‚СЊСЃСЏ Рє legacy MVP РєР°Рє Рє РѕСЃРЅРѕРІРЅРѕР№ Р±Р°Р·Рµ.
- РќРµ Р»РѕРјР°С‚СЊ РјРѕРґСѓР»СЊРЅСѓСЋ СЃС‚СЂСѓРєС‚СѓСЂСѓ РІ СЃС‚РѕСЂРѕРЅСѓ РјРѕРЅРѕР»РёС‚РЅРѕРіРѕ СЃРєСЂРёРїС‚Р°.
- РќРµ СЃРѕС…СЂР°РЅСЏС‚СЊ СЃРµРєСЂРµС‚С‹ Р±РµР· СЏРІРЅРѕРіРѕ opt-in.
- РќРµ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ destructive git-РѕРїРµСЂР°С†РёРё.

## 10) РљРѕСЂРѕС‚РєРѕРµ СЂРµР·СЋРјРµ СЌС‚Р°РїР°

РџСЂРѕРµРєС‚ РЅР° СЃС‚Р°РґРёРё: **feature-complete РґР»СЏ MVP+ РїРѕ PRD (core + auth UX + portable build)**.
РўРµРєСѓС‰РёР№ С„РѕРєСѓСЃ: СЃС‚Р°Р±РёР»РёР·Р°С†РёСЏ portable СЂРµР»РёР·Р°, QA Рё security-hardening (secure credential storage).

## 11) Decision Log

- 2026-03-26: Product name fixed as `Voodoo Loader`.
- 2026-03-26: Legacy MVP files in repo root are excluded from architecture baseline; active codebase is `src/voodoo_loader`.
- 2026-03-26: Queue model fixed as dynamic queue (add links while active) plus batch import from `.txt`.
- 2026-03-26: Queue concurrency controlled by `max_concurrent_downloads`; value `0` means unlimited.
- 2026-03-26: Product scope fixed as universal downloader (not Hugging Face-only).
- 2026-03-26: Auth UX standardized via `Auth mode`: `No auth` / `Token + headers` / `Login/password`.
- 2026-03-26: Secrets are non-persistent by default; persistence only through explicit opt-in (`Remember token`, `Remember username`).
- 2026-03-26: Secret masking is mandatory in command preview and logs.
- 2026-03-26: Progress UX fixed: `downloaded/total`, `remaining`, `speed`, `ETA` are shown in UI (not logs-only).
- 2026-03-26: `aria2c` binary provisioning is mandatory; RPC is optional and does not replace local binary dependency.
- 2026-03-26: Distribution priority fixed as portable build (`VoodooLoader.exe`) over installer.
- 2026-03-26: Reproducible packaging pipeline fixed via PyInstaller (`packaging/voodoo_loader.spec`, `scripts/build_portable.ps1`).
- 2026-03-26: Portable artifacts successfully built: `dist/portable/VoodooLoader/VoodooLoader.exe` and `dist/portable/VoodooLoader-portable.zip`.
- 2026-03-26: Security trade-off documented: in portable mode, opt-in credentials are stored in plaintext JSON near exe; secure-store migration is in roadmap.

## 12) Reliability Incident Log (Skill Pipeline)

Р­С‚РѕС‚ СЂР°Р·РґРµР» РѕР±СЏР·Р°С‚РµР»РµРЅ Рє РїРѕРїРѕР»РЅРµРЅРёСЋ РїСЂРё РєР°Р¶РґРѕРј Р±Р°РіС„РёРєСЃРµ/СЂРµРіСЂРµСЃСЃРµ/РїСЂРѕР±Р»РµРјРµ СЃР±РѕСЂРєРё.

### 2026-03-26 - Portable startup import crash
- Symptom: Р·Р°РїСѓСЃРє `dist/portable/VoodooLoader.exe` РїР°РґР°Р» СЃ `ImportError: attempted relative import with no known parent package`.
- Root cause: entry-point `src/voodoo_loader/main.py` РёСЃРїРѕР»СЊР·РѕРІР°Р» relative imports (`from .app ...`), С‡С‚Рѕ Р»РѕРјР°РµС‚СЃСЏ РІ packaged runtime-РєРѕРЅС‚РµРєСЃС‚Рµ PyInstaller.
- Fix: РїРµСЂРµРІРµРґРµРЅС‹ РёРјРїРѕСЂС‚С‹ РІ `main.py` РЅР° absolute (`from voodoo_loader.app ...`, `from voodoo_loader.main_window ...`).
- Regression checks: `ruff`, `mypy`, `pytest`, РїРµСЂРµСЃР±РѕСЂРєР° portable, smoke launch `VoodooLoader.exe`.
- Prevention rule: entry-point С„Р°Р№Р»С‹ РґР»СЏ packaged build РґРѕР»Р¶РЅС‹ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ С‚РѕР»СЊРєРѕ absolute imports.

### 2026-03-26 - Portable build file lock (WinError 5)
- Symptom: PyInstaller build РїР°РґР°Р» РЅР° СЌС‚Р°РїРµ `EXE` СЃ `PermissionError: [WinError 5]` РїСЂРё Р·Р°РїРёСЃРё `dist/portable/VoodooLoader.exe`.
- Root cause: РІ РјРѕРјРµРЅС‚ СЃР±РѕСЂРєРё Р±С‹Р»Рё Р·Р°РїСѓС‰РµРЅС‹ Р°РєС‚РёРІРЅС‹Рµ РїСЂРѕС†РµСЃСЃС‹ `VoodooLoader.exe`, Р±Р»РѕРєРёСЂРѕРІР°РІС€РёРµ exe-С„Р°Р№Р».
- Fix: РѕСЃС‚Р°РЅРѕРІР»РµРЅС‹ РїСЂРѕС†РµСЃСЃС‹ `VoodooLoader`, Р·Р°С‚РµРј РІС‹РїРѕР»РЅРµРЅР° РїРѕРІС‚РѕСЂРЅР°СЏ СЃР±РѕСЂРєР°.
- Regression checks: РїСЂРѕРІРµСЂРєР° РїСЂРѕС†РµСЃСЃР° РїРµСЂРµРґ СЃР±РѕСЂРєРѕР№, СѓСЃРїРµС€РЅР°СЏ РїРѕР»РЅР°СЏ СЃР±РѕСЂРєР° portable Рё РїСЂРѕРІРµСЂРєР° Р°СЂС‚РµС„Р°РєС‚РѕРІ.
- Prevention rule: РїРµСЂРµРґ Р»СЋР±РѕР№ portable-СЃР±РѕСЂРєРѕР№ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ Р·Р°РІРµСЂС€Р°С‚СЊ РІСЃРµ РїСЂРѕС†РµСЃСЃС‹ `VoodooLoader.exe`.



### 2026-03-26 - Queue downloads received hash-like filenames from redirected sources
- Symptom: РїСЂРё multi-queue Р·Р°РіСЂСѓР·РєРµ (РЅР°РїСЂРёРјРµСЂ, Hugging Face `?download=true`) С„Р°Р№Р»С‹ СЃРѕС…СЂР°РЅСЏР»РёСЃСЊ РєР°Рє РґР»РёРЅРЅС‹Рµ hash-СЃС‚СЂРѕРєРё РІРјРµСЃС‚Рѕ РѕР¶РёРґР°РµРјС‹С… РёРјС‘РЅ `.safetensors`.
- Root cause: `-o` Р·Р°РґР°РІР°Р»СЃСЏ С‚РѕР»СЊРєРѕ РїСЂРё СЂСѓС‡РЅРѕРј `filename_override`; РїСЂРё РїР°РєРµС‚РЅРѕР№ РѕС‡РµСЂРµРґРё override РёРіРЅРѕСЂРёСЂРѕРІР°Р»СЃСЏ, Рё aria2 Р±СЂР°Р» РёРјСЏ РёР· redirect URL (hash key).
- Fix: РІ `Aria2Service.build_command_args` РґРѕР±Р°РІР»РµРЅ Р°РІС‚Рѕ-РІС‹РІРѕРґ РёРјРµРЅРё РёР· РёСЃС…РѕРґРЅРѕРіРѕ URL path РґР»СЏ РєР°Р¶РґРѕРіРѕ item (РµСЃР»Рё РёРјСЏ РґРѕСЃС‚СѓРїРЅРѕ), СЃ РїСЂРёРѕСЂРёС‚РµС‚РѕРј СЂСѓС‡РЅРѕРіРѕ override.
- Regression checks: `ruff`, `mypy`, `pytest`, rebuild portable, smoke launch exe.
- Prevention rule: РґР»СЏ URL СЃ СЏРІРЅС‹Рј basename РІ path РІСЃРµРіРґР° РїРµСЂРµРґР°РІР°С‚СЊ `-o <basename>` РІ aria2, С‡С‚РѕР±С‹ redirect-URL РЅРµ РїРµСЂРµРёРјРµРЅРѕРІС‹РІР°Р» С„Р°Р№Р»С‹ РІ hash.

### 2026-03-27 - UI/UX upgrade batch implemented (menus/queue/settings)
- Scope: queue column redesign, checkbox selection, drag-and-drop reorder, priority menu, status colors, File/Downloads/View/Settings menu layout, Import action move, open file/folder actions, logs visibility toggle and sort actions.
- Settings migration: aria2 tuning and auth controls moved to Settings dialog; inline queue-management buttons removed from primary control row and moved to context/menu actions.
- Verification: `ruff`, `mypy`, `pytest` passed (`45 passed`).
- Audio: integrated status-based playback for start/success/failure using provided assets.
- Smoke run: application start verified after sound integration.
- 2026-03-27: Fixed top-menu overlap caused by visible service controls and added Progress accordion (Less/More).

### 2026-03-27 - Queue rows unreadable on dark theme
- Symptom: РІ Р±Р»РѕРєРµ РѕС‡РµСЂРµРґРё СЃС‚СЂРѕРєРё РІС‹РіР»СЏРґРµР»Рё В«Р±РµР»С‹РјРёВ», СЃРѕРґРµСЂР¶РёРјРѕРµ Р±С‹Р»Рѕ РїР»РѕС…Рѕ С‡РёС‚Р°РµРјРѕ (РЅРёР·РєРёР№ РєРѕРЅС‚СЂР°СЃС‚ С‚РµРєСЃС‚Р°/С„РѕРЅР°).
- Root cause: РІ `_append_or_update_row` РґР»СЏ СЃС‚Р°С‚СѓСЃР° `Queued` РїСЂРёРЅСѓРґРёС‚РµР»СЊРЅРѕ Р·Р°РґР°РІР°Р»СЃСЏ С„РѕРЅ `#ffffff`, Р° С†РІРµС‚ С‚РµРєСЃС‚Р° РЅРµ С„РёРєСЃРёСЂРѕРІР°Р»СЃСЏ; РІ dark theme С‚РµРєСЃС‚ РѕСЃС‚Р°РІР°Р»СЃСЏ СЃРІРµС‚Р»С‹Рј.
- Fix: РґРµС„РѕР»С‚РЅС‹Р№ С„РѕРЅ РїРµСЂРµРІРµРґС‘РЅ РЅР° theme-aware `palette.base()`, РґРѕР±Р°РІР»РµРЅ Р°РІС‚Рѕ-РїРѕРґР±РѕСЂ `foreground` РїРѕ РєРѕРЅС‚СЂР°СЃС‚Сѓ Рё СЏРІРЅР°СЏ СѓСЃС‚Р°РЅРѕРІРєР° `cell.setForeground(...)`.
- Regression checks: РІРёР·СѓР°Р»СЊРЅР°СЏ РїСЂРѕРІРµСЂРєР° РѕС‡РµСЂРµРґРё РІ dark theme, `ruff`, `mypy`, `pytest`.
- Prevention rule: РґР»СЏ С‚Р°Р±Р»РёС† Qt РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ palette-aware default colors; РїСЂРё РєР°СЃС‚РѕРјРЅРѕРј С„РѕРЅРµ СЃС‚СЂРѕРєРё РІСЃРµРіРґР° Р·Р°РґР°РІР°С‚СЊ РєРѕРЅС‚СЂР°СЃС‚РЅС‹Р№ foreground.

### 2026-03-27 - No sound playback in portable runtime
- Symptom: РІ СЃРѕР±СЂР°РЅРЅРѕР№ portable-РІРµСЂСЃРёРё Р·РІСѓРєРё start/success/failure РЅРµ РІРѕСЃРїСЂРѕРёР·РІРѕРґРёР»РёСЃСЊ.
- Root cause: `SoundService` Р·Р°РІРёСЃРµР» РѕС‚ РѕРґРЅРѕРіРѕ `QMediaPlayer` Рё СѓР·РєРѕРіРѕ РїСѓС‚Рё СЂРµСЃСѓСЂСЃРѕРІ; РІ packaged runtime СЌС‚Рѕ РїСЂРёРІРѕРґРёР»Рѕ Рє silent-failure (РѕСЃРѕР±РµРЅРЅРѕ РїСЂРё Р±С‹СЃС‚СЂС‹С… СЃРѕР±С‹С‚РёСЏС…/РІР°СЂРёР°РЅС‚Р°С… СЂР°СЃРїРѕР»РѕР¶РµРЅРёСЏ СЂРµСЃСѓСЂСЃРѕРІ).
- Fix: СЂРµР°Р»РёР·РѕРІР°РЅ resilient sound pipeline: СЂР°СЃС€РёСЂРµРЅРЅС‹Р№ РїРѕРёСЃРє СЂРµСЃСѓСЂСЃРѕРІ (`_MEIPASS`, `_internal`, `sys.executable`), РѕС‚РґРµР»СЊРЅС‹Р№ player/audio-output РЅР° СЃРѕР±С‹С‚РёРµ, РѕР±СЂР°Р±РѕС‚РєР° media errors СЃ Р»РѕРіРёСЂРѕРІР°РЅРёРµРј.
- Regression checks: `ruff`, `mypy`, `pytest` (РІРєР»СЋС‡Р°СЏ РѕР±РЅРѕРІР»С‘РЅРЅС‹Рµ С‚РµСЃС‚С‹ `test_sound_service.py` РґР»СЏ `_MEIPASS` Рё `_internal` fallback), РїРµСЂРµСЃР±РѕСЂРєР° portable.
- Prevention rule: multimedia РІ packaged build РґРѕР»Р¶РЅРѕ РёРјРµС‚СЊ runtime-fallback РїСѓС‚Рё Рё error logging; playback РЅРµ РґРѕР»Р¶РµРЅ Р·Р°РІРёСЃРµС‚СЊ РѕС‚ РѕРґРЅРѕРіРѕ shared player.

### 2026-03-27 - Portable audio silent despite packaged sound assets
- Symptom: РІ РѕС‡РµСЂРµРґРё/Р·Р°РІРµСЂС€РµРЅРёРё Р·Р°РіСЂСѓР·РєРё РЅРµ СЃР»С‹С€РЅС‹ start/success/failure Р·РІСѓРєРё, С…РѕС‚СЏ mp3 РїСЂРёСЃСѓС‚СЃС‚РІСѓСЋС‚ РІ `dist`.
- Root cause: Р·Р°РІРёСЃРёРјРѕСЃС‚СЊ РѕС‚ Qt Multimedia backend Р±РµР· platform fallback РїСЂРёРІРѕРґРёР»Р° Рє silent-runtime РєРµР№СЃР°Рј РЅР° С‡Р°СЃС‚Рё Windows РѕРєСЂСѓР¶РµРЅРёР№.
- Fix: `SoundService` РґРѕРїРѕР»РЅРµРЅ Windows MCI fallback (mp3), runtime audio diagnostics `[AUDIO] ...`, СѓСЃРёР»РµРЅ Qt playback setup (unmuted + volume 1.0) Рё СЃРѕС…СЂР°РЅС‘РЅ multi-path resource resolve.
- Regression checks: `ruff`, `mypy`, `pytest` (`46 passed`), portable rebuild.
- Prevention rule: РґР»СЏ РјСѓР»СЊС‚РёРјРµРґРёР° РІ desktop portable РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ РёРјРµС‚СЊ backend fallback Рё СЏРІРЅС‹Рµ runtime diagnostics РІ UI logs.

### 2026-03-27 - Sound triggers skipped due shared queue-item mutation
- Symptom: РІ Logs РѕС‚СЃСѓС‚СЃС‚РІРѕРІР°Р»Рё СЃС‚СЂРѕРєРё `[AUDIO]`, Р·РІСѓРєРё СЃС‚Р°СЂС‚Р°/СѓСЃРїРµС…Р°/РѕС€РёР±РєРё РЅРµ РІРѕСЃРїСЂРѕРёР·РІРѕРґРёР»РёСЃСЊ.
- Root cause: `Aria2Service` Рё UI СЂР°Р·РґРµР»СЏР»Рё РѕРґРёРЅ Рё С‚РѕС‚ Р¶Рµ СЌРєР·РµРјРїР»СЏСЂ `QueueItem`; СЃС‚Р°С‚СѓСЃ РјСѓС‚РёСЂРѕРІР°Р» РІ СЃРµСЂРІРёСЃРµ РґРѕ РѕР±СЂР°Р±РѕС‚РєРё СЃРёРіРЅР°Р»Р° РІ UI, РїРѕСЌС‚РѕРјСѓ `previous_status` == `new_status` Рё sound-trigger Р±Р»РѕРє РЅРµ СЃСЂР°Р±Р°С‚С‹РІР°Р».
- Fix: РІ `Aria2Service.enqueue_items` РІРІРµРґРµРЅРѕ РєРѕРїРёСЂРѕРІР°РЅРёРµ `QueueItem` (`dataclasses.replace`) РґР»СЏ РёР·РѕР»СЏС†РёРё service-state РѕС‚ UI-state; РІ UI РґРѕР±Р°РІР»РµРЅС‹ СЏРІРЅС‹Рµ Р»РѕРі-Р·Р°РїРёСЃРё `[AUDIO] Trigger ...`.
- Regression checks: `ruff`, `mypy`, `pytest` (`47 passed`), portable rebuild.
- Prevention rule: СЃРѕСЃС‚РѕСЏРЅРёРµ РґРѕРјРµРЅРЅРѕР№ РјРѕРґРµР»Рё РјРµР¶РґСѓ worker/service Рё UI РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РёР·РѕР»РёСЂРѕРІР°РЅРѕ; shared mutable objects РґР»СЏ СЃС‚Р°С‚СѓСЃРЅС‹С… СЃРѕР±С‹С‚РёР№ Р·Р°РїСЂРµС‰РµРЅС‹.


### 2026-03-28 - Queue drag-and-drop corrupted rows/selection (row loss, naming mismatch)
- Symptom: ??? drag'n'drop ? Download queue ???????? select, ???????? ?????? (????????, ???? 3 ??????, ??????????? 2), ??????? naming.
- Root cause: reliance ?? `QTableWidget` internal move (`rowsMoved`) ???????? ? ???????????? ???????????? item-level ?????; ?????? ? `queue_order` ???????????.
- Fix: ??????? controlled DnD pipeline: `QueueTableWidget` ? `rows_dropped` ???????? + deterministic reorder ????? `MainWindow._reorder_ids_by_drag_drop(...)` + ???????????? rebuild ??????? ????? reorder.
- Regression checks: `PYTHONPATH=src pytest -q` -> `49 passed`.
- Prevention rule: ??? queue reorder ???????????? domain-order (`queue_order`) ??? single source of truth; UI-table ????? dnd ?????? ???????? ?????? ????? rebuild.

### 2026-03-28 - Source recovery incident (`main_window.py` truncation)
- Symptom: `src/voodoo_loader/main_window.py` ???????? ??????????? ?????? (3 ?????) ????? ????????? ??????? ??????.
- Root cause: failed edit flow + unreliable patch path ? sandbox ? `apply_patch` setup refresh errors.
- Fix: ???? ????????? ???????????? ?? runtime artifacts (`.pyc` + ?????????????? ???????), ??????????? ?????? ??????? ?????????? ?? ??????? ??????, ????????? ???????? ????????.
- Regression checks: ?????? ????????????? (`py_compile`), import ???????, `49 passed`.
- Prevention rule: ????? ????????? ???????? ?????? pre-edit backup ?????????; ??? sandbox patch-failure ?????????? ?? scripted non-destructive edits ? ??????????????? compile checks.


### 2026-03-28 - Queue drag-and-drop rows disappearing (Qt move-action side effect)
- Symptom: ??? drag'n'drop ?????? ??????? ????????/??????????? ?????????? ????????? ? UI.
- Root cause: `QTableWidget` DnD ??????? ? `MoveAction`, ????? ????? ????????? ??????? ??????? ??/?? ????? ????????????????? reorder.
- Fix: `QueueTableWidget` ????????? ?? ?????????? DnD pipeline (`startDrag` + `dropEvent`) ? `CopyAction` ? ?????? reorder ????? `queue_order` ??? source-of-truth.
- Regression checks: targeted queue tests + full `pytest` pass.
- Prevention rule: ??? reorder ? ??????? ?? ???????????? model-mutating move-action, ???? ??????? ??????????? ???????? ???????.


### 2026-03-28 - Drag'n'drop loop incident: blocked drag vs disappearing rows
- Symptom: ? ???????????????? ???c?? ??????? ?? ?????? ?????? ??? ??????????????, ?? ??????????? ??????????????? ?????.
- Root cause:
  1) `MoveAction` ? item-based `QTableWidget` ??? ?????????? ?????????? ??????, ??????? ?????????? ?????? ?????.
  2) ????? ??????? ??????? ????????? `startDrag` ?????????? ?????????? drag-gesture ? ???? ????????? ?????? ??????.
- Final fix: ??????? ?????????? MIME-based DnD ??? ?????????? ????? (`application/x-voodoo-loader-rows`) ? ????? ????????????? source rows, ?????? reorder ????? `queue_order` (source of truth) ? ?????????? `dropEvent` ??? model-side row loss.
- Added diagnostics/tests: `tests/test_queue_dragdrop.py` + ?????????? no-loss/no-dup/order-update ? unit-level ?????????.
- Verification gate before build: `ruff` + targeted DnD tests + full `pytest` must pass.
- Prevention rule: DnD reorder ? item-based view ?????? ????????? ?? ???????? ?????? ??????? ? ????????????? ???????????? ??????????? ??????? ???????.


### 2026-03-28 - DnD source mismatch (viewport vs widget) causing row-loss loop
- Symptom: ????? ????? ?????? drag'n'drop ????? ?? ?????: ???? ?????? ????????, ???? drag ????????????.
- Root cause: Qt DnD source ????? ???? `viewport()`, ? ?? ??? `QTableWidget`; ??? ??????? ???????? `event.source() is self` ????????? ??????? ? `super().dropEvent(...)`, ??? ????? ????? ?????????? item-model ? ????????? ?????? ??????.
- Fix: ?????? internal-source guard (`self` or `viewport`) + MIME-based row payload + manual reorder ?? `queue_order`.
- Tests added: widget-level DnD tests (`tests/test_queue_dragdrop_widget.py`) + existing queue DnD regression suite.
- Prevention rule: DnD event-handlers ??????? ????????? `viewport` source ??? item views; ????? DnD fix/update ?????????????? widget-level ? domain-level ??????? ?? ??????.


### 2026-03-28 - Start button regression: queue did not start due broken options builder
- Symptom: clicking `Start` did nothing (queue did not launch).
- Root cause: `_build_download_options()` contained a malformed/decompiled code path and failed at runtime before `aria2_service.start()`.
- Fix: rewrote `_build_download_options()` to a deterministic implementation using `_resolve_auth_payload(...)` and explicit `DownloadOptions(...)` mapping.
- Regression checks: added `tests/test_main_window_download_options.py` to validate payload construction and prevent silent runtime breakage; full `pytest` required before build.
- Prevention rule: every change in start-path methods (`_start_queue`, `_build_download_options`, auth resolution) must be covered by a focused unit test.

### 2026-03-28 - Help menu and GitHub Releases updater implemented
- Scope: added top-level `Help` menu with modal `Check updates` and `About` actions.
- Update backend: `UpdateService` (`services/update_service.py`) with GitHub Releases API integration, semantic version comparison, preferred portable-zip asset selection, optional `.sha256` verification, and Windows external updater handoff.
- UX flow: checking modal -> update/no-update modal -> confirm update -> download -> close/restart handoff via updater script.
- Persistence: new settings field `update_repository` (for release channel repository).
- Regression coverage: added `tests/test_update_service.py`, localization key coverage extended, settings roundtrip coverage extended.

### 2026-03-28 - Encoding incident during localization update
- Symptom: test collection failed with syntax errors after localization edits.
- Root cause: malformed textual replacement inserted literal escape tokens into test source and one localization write pass used unsafe encoding flow.
- Fix: rewrote affected files in explicit UTF-8, restored clean Python syntax, re-ran full test suite.
- Prevention rule: for Python source writes use explicit UTF-8 output and avoid inline escape-token replacements inside code lists.
### 2026-03-28 - Cross-platform packaging pipeline (Windows x64 + Ubuntu x64)
- Implemented standardized artifact naming with version/platform/arch in filename.
- Added Linux packaging script and GitHub Actions matrix workflow for Windows x64 and Ubuntu x64.
- Added release automation on tag push (`v*`) to attach generated artifacts to GitHub Release.
- Update service asset selection upgraded to runtime OS/arch-aware matching.
- Windows x86 target marked deferred due current PySide6/Qt6 stack limitation.
### 2026-03-28 - Linux CI PyInstaller COLLECT name conflict
- Symptom: Ubuntu build failed during COLLECT with Resource '.../dist/portable/VoodooLoader' is not a valid file.
- Root cause: in packaging/voodoo_loader.spec, both EXE and COLLECT used the same name (VoodooLoader). On Linux this causes a binary-vs-folder naming collision.
- Fix: split names by platform: EXE uses VoodooLoader on Windows and VoodooLoader-bin on non-Windows; COLLECT keeps folder name VoodooLoader.
- Build script hardening: scripts/build_portable.sh now validates both binary names (VoodooLoader and VoodooLoader-bin).
- CI hardening: Ubuntu workflow installs required Qt/Pulse/XCB system libraries before build.
- Regression checks: py_compile for spec + pytest (64 passed).
- Prevention rule: for PyInstaller one-folder mode, executable name and collect directory name must never be identical on non-Windows targets.

### 2026-03-28 - QA gate automation for commit/push and PR merge
- Added cross-platform local QA scripts: scripts/qa_gate.ps1 and scripts/qa_gate.sh.
- Added repository-managed pre-push hook: .githooks/pre-push, with bootstrap installers scripts/install_git_hooks.ps1 and scripts/install_git_hooks.sh.
- Added CI workflow .github/workflows/qa-gate.yml that runs lint/type/tests on pull_request and push to master / dev/**.
- Added governance guide: docs/REPO_GOVERNANCE.md with branch protection required check QA Gate / qa.
- Process rule updated: no commit/push/merge without green QA gate.

