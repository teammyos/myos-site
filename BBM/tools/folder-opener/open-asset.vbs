Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Environment("Process")("BBM_ASSET_URL") = WScript.Arguments(0)
shell.Run "powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & shell.ExpandEnvironmentStrings("%APPDATA%") & "\BBMFolderOpener\open-asset.ps1" & Chr(34), 0, False
