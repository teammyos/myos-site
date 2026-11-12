# בונה את bbm-folder-setup.bat מתוך open-asset.ps1 + open-asset.vbs
import base64
ps1=open('open-asset.ps1',encoding='utf-8').read().replace('\r\n','\n').replace('\n','\r\n')
ps1b=b'\xef\xbb\xbf'+ps1.encode('utf-8')
vbs=open('open-asset.vbs').read().replace('\r\n','\n').replace('\n','\r\n').encode('ascii')
setup=f'''$dir = "$env:APPDATA\\BBMFolderOpener"
if (-not (Test-Path $dir)) {{ New-Item -Path $dir -ItemType Directory | Out-Null }}
[IO.File]::WriteAllBytes("$dir\\open-asset.ps1", [Convert]::FromBase64String('{base64.b64encode(ps1b).decode()}'))
[IO.File]::WriteAllBytes("$dir\\open-asset.vbs", [Convert]::FromBase64String('{base64.b64encode(vbs).decode()}'))
$reg = "HKCU:\\Software\\Classes\\bbmasset"
New-Item -Path $reg -Force | Out-Null
Set-ItemProperty -Path $reg -Name "(default)" -Value "URL:BBM Asset Folder"
Set-ItemProperty -Path $reg -Name "URL Protocol" -Value ""
New-Item -Path "$reg\\shell\\open\\command" -Force | Out-Null
Set-ItemProperty -Path "$reg\\shell\\open\\command" -Name "(default)" -Value ('wscript.exe //B //NoLogo "' + "$dir\\open-asset.vbs" + '" "%1"')
'''
enc=base64.b64encode(setup.encode('utf-16le')).decode()
bat=f'''@echo off
chcp 65001 > nul
echo BBM - הגדרת פתיחת תיקיות נכס מהאתר ...
powershell -NonInteractive -NoProfile -EncodedCommand {enc}
echo.
echo  ההגדרה הושלמה. מעכשיו הכפתור "פתיחת תיקיית הנכס" באתר יפתח את התיקייה.
echo  (חד-פעמי, לכל משתמש. הרצה חוזרת מעדכנת. לא נוגע במערכת השמאות.)
echo.
pause
'''
open('bbm-folder-setup.bat','w',encoding='utf-8',newline='\r\n').write(bat)
