@echo off
chcp 65001 >nul
title json-humanized - Push to GitHub (anom-developer)
echo ========================================================
echo   json-humanized - Отправка на GitHub (anom-developer)
echo ========================================================
echo.

rem Проверяем наличие git в PATH или в стандартных папках
set "GIT_CMD=git"
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
    ) else (
        echo [!] Программа Git не установлена на компьютере.
        echo.
        echo Чтобы отправить проект на GitHub, выберите удобный способ:
        echo.
        echo  1) Установите Git для Windows:
        echo     https://git-scm.com/download/win
        echo     (После установки просто запустите этот push-to-github.bat снова!)
        echo.
        echo  2) Или используйте GitHub Desktop (программа с кнопками):
        echo     https://desktop.github.com
        echo     (В ней: File - Add Local Repository - выбрать эту папку - Push)
        echo.
        echo  3) Или загрузите файлы через сайт:
        echo     https://github.com/anom-developer/json-humanized
        echo     (Кнопка Add file - Upload files)
        echo.
        pause
        exit /b 1
    )
)

echo [1/3] Индексация всех файлов...
"%GIT_CMD%" add .

echo [2/3] Проверка коммита...
"%GIT_CMD%" commit -m "Update json-humanized v2.2.0: font harmonization, instant metadata detection, browser extension and offline UI" 2>nul
if %ERRORLEVEL% equ 0 (
    echo [i] Создан новый коммит.
) else (
    echo [i] Все файлы уже зафиксированы в коммите.
)

echo [3/3] Отправка в репозиторий GitHub (main)...
"%GIT_CMD%" push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   Успешно выложено на GitHub!
    echo   Репозиторий: https://github.com/anom-developer/json-humanized
    echo ========================================================
) else (
    echo.
    echo [!] Не удалось отправить. Проверьте:
    echo  1. Создан ли репозиторий https://github.com/anom-developer/json-humanized на сайте GitHub.
    echo  2. Вошли ли вы в свой аккаунт anom-developer в браузере или через Git.
)

echo.
pause
