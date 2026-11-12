# BBM – פתיחת תיקיית נכס מהאתר
# מופעל דרך הקישור bbmasset:<מספר נכס> (הכתובת מגיעה במשתנה BBM_ASSET_URL)
# בטיחות: מקבלים רק מספר נכס (ספרות). פותחים רק תיקייה קיימת בתוך תיקיית תיקי הנכס. שום דבר אחר לא נפתח ולא מורץ.
$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject WScript.Shell
function Say([string]$msg, [int]$icon) { [void]$shell.Popup($msg, $(if ($icon -eq 16) { 0 } else { 8 }), 'BBM – פתיחת תיקיית נכס', $icon) }

$bases = @('\\bbwinserv\work\הנדסה\מחלקת נכסים', 'W:\', '\\bbwinserv\work')
function Find-Root {
  foreach ($b in $bases) {
    if (-not (Test-Path -LiteralPath $b -PathType Container)) { continue }
    # "אגף נכסים" ובתוכה תיקייה שבשמה "תיקי נכס" (בלי תלות ברווחים/סוג המקף)
    $agaf = Get-ChildItem -LiteralPath $b -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name.Trim() -eq 'אגף נכסים' } | Select-Object -First 1
    foreach ($parent in @($agaf, (Get-Item -LiteralPath $b))) {
      if (-not $parent) { continue }
      $t = Get-ChildItem -LiteralPath $parent.FullName -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*תיקי נכס*' } | Select-Object -First 1
      if ($t) { return $t.FullName }
    }
  }
  return $null
}
try {
  $raw = [Uri]::UnescapeDataString([string]$env:BBM_ASSET_URL) -replace '^bbmasset:/*', ''
  $num = $raw.Trim().TrimEnd('/')
  if ($num -notmatch '^\d{4,6}$') { throw "מספר נכס לא תקין: $num" }

  $root = Find-Root
  if (-not $root) {
    $diag = foreach ($b in $bases) { $ok = Test-Path -LiteralPath $b; "$b : " + $(if ($ok) { ((Get-ChildItem -LiteralPath $b -Directory -ErrorAction SilentlyContinue | Select-Object -First 6 -ExpandProperty Name) -join ' | ') } else { 'לא נגיש' }) }
    throw ("תיקיית 'תיקי נכס' לא נמצאה. מה נבדק:`n" + ($diag -join "`n"))
  }

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
