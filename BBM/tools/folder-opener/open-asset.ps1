# BBM – פתיחת תיקיית נכס מהאתר
# מופעל דרך הקישור bbmasset:<מספר נכס> (הכתובת מגיעה במשתנה BBM_ASSET_URL)
# בטיחות: מקבלים רק מספר נכס (ספרות). פותחים רק תיקייה קיימת בתוך תיקיית תיקי הנכס. שום דבר אחר לא נפתח ולא מורץ.
$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject WScript.Shell
function Say([string]$msg, [int]$icon) { [void]$shell.Popup($msg, 8, 'BBM – פתיחת תיקיית נכס', $icon) }

$roots = @(
  '\\bbwinserv\work\אגף נכסים\אגף נכסים - תיקי נכס',
  'W:\אגף נכסים\אגף נכסים - תיקי נכס'
)
try {
  $raw = [Uri]::UnescapeDataString([string]$env:BBM_ASSET_URL) -replace '^bbmasset:/*', ''
  $num = $raw.Trim().TrimEnd('/')
  if ($num -notmatch '^\d{4,6}$') { throw "מספר נכס לא תקין: $num" }

  $root = $roots | Where-Object { Test-Path -LiteralPath $_ -PathType Container } | Select-Object -First 1
  if (-not $root) { throw "תיקיית תיקי הנכס לא נמצאה במחשב הזה:`n$($roots[0])" }

  # תיקייה ששמה מסתיים ב "- <מספר נכס>" – ברמה הראשית או רמה אחת מתחת (למשל "פרויקטים פעילים")
  $hit = Get-ChildItem -LiteralPath $root -Directory -Depth 1 -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -match ("-\s*" + $num + "\s*$") } | Select-Object -First 1

  if ($hit) {
    $full = (Resolve-Path -LiteralPath $hit.FullName).ProviderPath
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw 'נתיב מחוץ לתיקיית תיקי הנכס' }
    Start-Process -FilePath "$env:WINDIR\explorer.exe" -ArgumentList ('"' + $full + '"')
  } else {
    Say ("לא נמצאה תיקייה לנכס $num.`nנפתחת תיקיית תיקי הנכס הראשית.") 48
    Start-Process -FilePath "$env:WINDIR\explorer.exe" -ArgumentList ('"' + $root + '"')
  }
} catch {
  Say ("לא ניתן לפתוח את התיקייה:`n" + $_.Exception.Message) 16
}
