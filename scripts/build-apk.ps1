# Build script for MSS Ponkumar Store Android APK
$ErrorActionPreference = "Stop"
Write-Host ">>> Building MSS Ponkumar Store Android APK..." -ForegroundColor Cyan

$env:JAVA_HOME = "C:\Program Files\Java\jdk-23"
$env:ANDROID_HOME = "C:\Users\HP\AppData\Local\Android\Sdk"

Push-Location "$PSScriptRoot\..\android"
try {
    .\gradlew.bat assembleDebug --stacktrace
    $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        $destDir = "$PSScriptRoot\..\release-android"
        if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
        Copy-Item $apkPath "$destDir\MSS_Ponkumar_Store.apk" -Force
        Copy-Item $apkPath "$PSScriptRoot\..\public\mss-ponkumar-store.apk" -Force
        Copy-Item $apkPath "$PSScriptRoot\..\.output\public\mss-ponkumar-store.apk" -Force -ErrorAction SilentlyContinue
        Write-Host ">>> SUCCESS: APK built at: $destDir\MSS_Ponkumar_Store.apk" -ForegroundColor Green
    } else {
        Write-Error "APK file not found after build!"
    }
} finally {
    Pop-Location
}

