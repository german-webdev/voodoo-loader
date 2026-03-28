# Voodoo Loader (Tauri v2)

Новая кодовая база Voodoo Loader на `Tauri v2 + React + TypeScript`.

## Текущий статус

- Базовый scaffold приложения создан.
- Поднят стартовый UI-shell (структура главного экрана под очередь загрузок, прогресс и логи).
- Следующий этап: подключение Rust-команд и queue engine.

## Локальный запуск (после установки зависимостей)

```bash
npm install
npm run tauri dev
```

## Пререквизиты

- Node.js LTS
- Rust toolchain
- OS prerequisites из документации Tauri:
  - https://v2.tauri.app/start/prerequisites/

## Рекомендованный IDE setup

- VS Code
- Tauri extension
- rust-analyzer
