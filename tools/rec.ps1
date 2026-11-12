# Screen-recording helpers for the THMR client window (dot-source this file).
#   $p = Start-Rec 'name'      -> starts 60fps window capture to captures/app/name.mkv
#   Stop-Rec $p                -> finalizes the file
#   Grab 'name'                -> single PNG frame (kills ffmpeg if the window is static)
$script:Root = 'E:\thmr-promo\version-1'
$script:Src = 'gfxcapture=window_exe=thmr_app:capture_cursor=0:max_framerate=60,hwdownload,format=bgra'

function Start-Rec([string]$name) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'ffmpeg'
  $psi.Arguments = "-y -v error -f lavfi -i `"$($script:Src),crop=trunc(iw/2)*2:trunc(ih/2)*2`" -r 60 -c:v libx264 -preset ultrafast -crf 12 -pix_fmt yuv420p captures\app\$name.mkv"
  $psi.RedirectStandardInput = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.WorkingDirectory = $script:Root
  return [System.Diagnostics.Process]::Start($psi)
}

function Stop-Rec($p) {
  try { $p.StandardInput.Write('q'); $p.StandardInput.Flush() } catch {}
  if (-not $p.WaitForExit(5000)) { try { $p.Kill() } catch {} }
}

function Grab([string]$name) {
  $out = Join-Path $script:Root "captures\app\$name.png"
  Remove-Item $out -ErrorAction SilentlyContinue
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'ffmpeg'
  $psi.Arguments = "-y -v error -f lavfi -i `"$($script:Src)`" -frames:v 1 captures\app\$name.png"
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.WorkingDirectory = $script:Root
  $p = [System.Diagnostics.Process]::Start($psi)
  $deadline = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $deadline) {
    if ($p.HasExited) { break }
    if ((Test-Path $out) -and ((Get-Item $out).Length -gt 1000)) { Start-Sleep -Milliseconds 300; break }
    Start-Sleep -Milliseconds 150
  }
  if (-not $p.HasExited) { try { $p.Kill() } catch {} }
  if (Test-Path $out) { "grab $name ok ($((Get-Item $out).Length) bytes)" } else { "grab $name FAILED" }
}
