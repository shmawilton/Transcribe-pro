Add-Type -AssemblyName System.Windows.Forms
$primary = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $primary.Bounds
$work = $primary.WorkingArea
Write-Host "Primary display (full): $($bounds.Width) x $($bounds.Height) pixels"
Write-Host "Working area (no taskbar): $($work.Width) x $($work.Height) pixels"
Write-Host "Total height: $($bounds.Height) px"
