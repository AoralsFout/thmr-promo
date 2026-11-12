# Windows capture toolkit: window enumeration / move / click / keys / system mute.
# Usage examples:
#   pwsh -File tools/win.ps1 -Action list
#   pwsh -File tools/win.ps1 -Action move -Match thmr -X 0 -Y 0 -W 1920 -H 1080
#   pwsh -File tools/win.ps1 -Action click -X 960 -Y 540
#   pwsh -File tools/win.ps1 -Action mute -On 1     (saves previous state to gen/mute_state.txt)
#   pwsh -File tools/win.ps1 -Action mute -On restore
param(
  [Parameter(Mandatory = $true)][string]$Action,
  [string]$Match = '',
  [int]$X = 0, [int]$Y = 0, [int]$W = 0, [int]$H = 0,
  [string]$Keys = '',
  [string]$On = ''
)

Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public class Win32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  public static void Click(int x, int y) {
    SetCursorPos(x, y);
    System.Threading.Thread.Sleep(120);
    mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(60);
    mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
  }
  public static void Wheel(int x, int y, int delta) {
    SetCursorPos(x, y);
    System.Threading.Thread.Sleep(60);
    mouse_event(0x0800, 0, 0, unchecked((uint)delta), UIntPtr.Zero);
  }
  public static void Drag(int x1, int y1, int x2, int y2, int steps, int stepMs) {
    SetCursorPos(x1, y1);
    System.Threading.Thread.Sleep(150);
    mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero);
    for (int i = 1; i <= steps; i++) {
      SetCursorPos(x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps);
      System.Threading.Thread.Sleep(stepMs);
    }
    System.Threading.Thread.Sleep(120);
    mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
  }
  public static void Park() { SetCursorPos(1900, 1070); }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  // Human-like click: glide to the target first so Flutter receives hover/move events.
  public static void SmoothClick(int x, int y) {
    POINT p; GetCursorPos(out p);
    int steps = 16;
    for (int i = 1; i <= steps; i++) {
      SetCursorPos(p.X + (x - p.X) * i / steps, p.Y + (y - p.Y) * i / steps);
      System.Threading.Thread.Sleep(14);
    }
    SetCursorPos(x + 1, y); System.Threading.Thread.Sleep(30);
    SetCursorPos(x, y); System.Threading.Thread.Sleep(160);
    mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero);
    System.Threading.Thread.Sleep(90);
    mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
  }
}
'@

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class Audio {
  static IAudioEndpointVolume Vol() {
    var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev = null;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
    IAudioEndpointVolume epv = null;
    var epvid = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
    return epv;
  }
  public static bool GetMute() { bool m; Marshal.ThrowExceptionForHR(Vol().GetMute(out m)); return m; }
  public static void SetMute(bool m) { Marshal.ThrowExceptionForHR(Vol().SetMute(m, Guid.Empty)); }
}
'@

function Get-AppWindows {
  $result = New-Object System.Collections.ArrayList
  $cb = [Win32+EnumWindowsProc] {
    param($h, $l)
    if ([Win32]::IsWindowVisible($h)) {
      $sb = New-Object System.Text.StringBuilder 512
      [void][Win32]::GetWindowText($h, $sb, 512)
      $title = $sb.ToString()
      if ($title.Length -gt 0) {
        $cb2 = New-Object System.Text.StringBuilder 256
        [void][Win32]::GetClassName($h, $cb2, 256)
        $r = New-Object Win32+RECT
        [void][Win32]::GetWindowRect($h, [ref]$r)
        $pid_ = 0
        [void][Win32]::GetWindowThreadProcessId($h, [ref]$pid_)
        $proc = (Get-Process -Id $pid_ -ErrorAction SilentlyContinue).ProcessName
        [void]$result.Add([pscustomobject]@{
          Hwnd = [int64]$h; Title = $title; Class = $cb2.ToString(); Process = $proc
          X = $r.Left; Y = $r.Top; W = ($r.Right - $r.Left); H = ($r.Bottom - $r.Top)
        })
      }
    }
    return $true
  }
  [void][Win32]::EnumWindows($cb, [IntPtr]::Zero)
  return $result
}

switch ($Action) {
  'none' { }
  'list' {
    Get-AppWindows | Where-Object { $_.Title -match $Match -or $_.Process -match $Match } | Format-Table -AutoSize | Out-String -Width 200
  }
  'move' {
    $win = Get-AppWindows | Where-Object { $_.Title -match $Match -or $_.Process -match $Match } | Select-Object -First 1
    if (-not $win) { "window not found for $Match"; exit 1 }
    $hwnd = [IntPtr]$win.Hwnd
    [void][Win32]::SetWindowPos($hwnd, [IntPtr]::Zero, $X, $Y, $W, $H, 0x0040)
    [void][Win32]::SetForegroundWindow($hwnd)
    Start-Sleep -Milliseconds 400
    "moved $($win.Title) to $X,$Y ${W}x${H}"
  }
  'focus' {
    $win = Get-AppWindows | Where-Object { $_.Title -match $Match -or $_.Process -match $Match } | Select-Object -First 1
    if (-not $win) { "window not found"; exit 1 }
    [void][Win32]::SetForegroundWindow([IntPtr]$win.Hwnd)
    "focused $($win.Title)"
  }
  'click' {
    [Win32]::Click($X, $Y)
    "clicked $X,$Y"
  }
  'keys' {
    $wsh = New-Object -ComObject WScript.Shell
    $wsh.SendKeys($Keys)
    "sent: $Keys"
  }
  'mute' {
    $stateFile = Join-Path $PSScriptRoot '..\gen\mute_state.txt'
    if ($On -eq '1') {
      $prev = [Audio]::GetMute()
      New-Item -ItemType Directory -Force (Split-Path $stateFile) | Out-Null
      Set-Content -Path $stateFile -Value ($(if ($prev) { '1' } else { '0' }))
      [Audio]::SetMute($true)
      "muted (previous state saved: $prev)"
    } elseif ($On -eq '0') {
      [Audio]::SetMute($false)
      "unmuted"
    } elseif ($On -eq 'restore') {
      if (Test-Path $stateFile) {
        $prev = (Get-Content $stateFile).Trim()
        [Audio]::SetMute($prev -eq '1')
        "restored mute=$prev"
      } else { "no saved state" }
    } else {
      "current mute: $([Audio]::GetMute())"
    }
  }
  default { "unknown action $Action" }
}
