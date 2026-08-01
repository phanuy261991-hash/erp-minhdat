# Go bo tac vu tu dong khoi dong da tao boi install-autostart.ps1.
# Chay voi quyen Administrator, tuong tu install-autostart.ps1.

$ErrorActionPreference = 'Stop'

$TaskName = 'ERP-MinhDat-KhoCongNo'

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Da go tac vu tu dong khoi dong '$TaskName'."
} else {
  Write-Host "Khong tim thay tac vu '$TaskName' - co the chua duoc cai hoac da go truoc do."
}
