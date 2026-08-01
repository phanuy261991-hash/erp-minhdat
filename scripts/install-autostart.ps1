# Dang ky ung dung tu dong chay khi Windows khoi dong, dung Task Scheduler co san cua Windows
# (khong can cai them phan mem). Chay tac vu 1 LAN DUY NHAT tren may chu that, voi quyen
# Administrator (chuot phai file nay > "Run with PowerShell", hoac mo PowerShell as Administrator
# roi chay: powershell -ExecutionPolicy Bypass -File install-autostart.ps1).
#
# Sau khi chay xong: tac vu se tu chay node.exe + backend\server.js moi khi may khoi dong (ke ca
# chua ai dang nhap Windows), va Windows se tu khoi dong lai neu tien trinh bi crash.
#
# Go bo: chay uninstall-autostart.ps1 (cung thu muc).

$ErrorActionPreference = 'Stop'

$TaskName = 'ERP-MinhDat-KhoCongNo'
$NodeExe = Join-Path $PSScriptRoot 'node.exe'
$ServerScript = Join-Path $PSScriptRoot 'backend\server.js'

if (-not (Test-Path $NodeExe)) {
  Write-Error "Khong tim thay $NodeExe - hay dat file nay cung thu muc voi node.exe (thu muc goc sau khi giai nen)."
  exit 1
}
if (-not (Test-Path $ServerScript)) {
  Write-Error "Khong tim thay $ServerScript - kiem tra lai thu muc backend\ da giai nen day du chua."
  exit 1
}

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Write-Host "Tac vu '$TaskName' da ton tai - go bo tac vu cu truoc khi tao lai."
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute $NodeExe -Argument '"backend\server.js"' -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings `
  -Description 'Tu dong chay may chu Phan mem quan ly kho va cong no khi Windows khoi dong.' | Out-Null

Start-ScheduledTask -TaskName $TaskName

Write-Host "Da dang ky va khoi dong tac vu '$TaskName'."
Write-Host "Kiem tra: mo Task Scheduler (taskschd.msc) hoac truy cap http://localhost:3000 tu trinh duyet."
