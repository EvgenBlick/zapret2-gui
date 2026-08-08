# 🚀 Zapret2 Manager (GUI для zapret2 & zapret)

> **Обратите внимание**: Данное приложение является графической оболочкой (GUI-менеджером) для утилиты обхода блокировок [`zapret2`](https://github.com/bol-van/zapret2) от автора **bol-van** и наборов пресетов `zapret-discord-youtube`. Приложение создано для удобного управления службой `winws2` без работы через командную строку или `.bat` файлы.

---

## 🌟 Ключевые возможности

- 🎯 **Авто-подбор стратегии (Auto DPI Scanner)**: Автоматический перебор **21 встроенной адаптивной комбинации** (`ALT1`..`ALT12`, `FAKE TLS AUTO`, `SIMPLE FAKE`, `Preset2`) с отправкой контрольных сетевых запросов к заблокированному сайту до первого успеха.
- 🌐 **Раздельное туннелирование сайтов**:
  - **Сайты обхода (`Hostlist`)**: Подменяет пакеты только для нужных доменов (`youtube.com`, `discord.com`, `googlevideo.com`).
  - **Сайты-исключения (`Hostlist Exclude`)**: Гарантирует прямое подключение без модификаций для критически важных ресурсов (Госуслуги, Сбербанк, VK, Яндекс).
- 💻 **Раздельное туннелирование приложений**: Управление процессами и автоматическая настройка фильтров WinDivert по портам приложений (`discord.exe`, `chrome.exe` и др.).
- ⚡ **Полная интеграция zapret2**: Автоматическая синхронизация бинарников `winws2.exe`, загрузка Lua-библиотек `zapret-lib.lua` и `zapret-antidpi.lua`.
- 🔔 **Уведомления и Системный трей**: Сворачивание в трей с уведомлениями Windows и быстрым меню управления.
- 📦 **Standalone Portable Сборка**: Возможность компиляции в единый `Zapret2Manager-Standalone.exe`, не требующий установки Node.js или дополнительных библиотек.

---

## 🛠️ Структура проекта

```text
zapret2-manager/
├── bin/                       # Бинарники winws2.exe, WinDivert.dll, Lua-скрипты
├── src/
│   ├── main.js                # Главный процесс Electron, WinDivert spawn, IPC, Store
│   ├── preload.js             # Безопасный ContextBridge API
│   └── renderer/
│       ├── index.html         # Графический интерфейс на HTML5
│       ├── app.js             # Логика UI, управление сайтами, сканер
│       └── styles.css         # Современные темные стили CSS3
├── scripts/
│   ├── build-single-exe.js    # Автоматическая сборка в единый Portable EXE (C# csc.exe)
│   └── convert-all-presets.js # Адаптер 21 пресета из zapret в формат zapret2
└── package.json
```

---

## 🚀 Быстрый запуск для разработки

```bash
# 1. Клонировать репозиторий
git clone https://github.com/USERNAME/zapret2-manager.git
cd zapret2-manager

# 2. Установить зависимости
npm install

# 3. Запустить в режиме разработки
npm start

# 4. Собрать единый Portable EXE для Windows
npm run build:single
```

---

## ⚖️ Отказ от ответственности (Disclaimer)

Проект является исключительно интерфейсной оболочкой (GUI). Все права на базовые бинарные файлы `winws2.exe`, библиотеки `WinDivert` и концепции десинхронизации пакетов принадлежат их оригинальным авторам:
- **zapret2 / winws2**: [bol-van/zapret2](https://github.com/bol-van/zapret2)
- **zapret-discord-youtube**: [Flowseal / Community Presets](https://github.com/bol-van/zapret)
