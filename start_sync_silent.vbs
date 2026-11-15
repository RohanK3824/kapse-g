' Kapse - G 🔰 Tailor Shop
' Silent Windows Background Auto-Sync Launcher
' Runs node services/syncDaemon.js completely invisible (no CMD window popup)

Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")

Dim nodeExe
nodeExe = "node"
If FSO.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = """C:\Program Files\nodejs\node.exe"""
End If

WshShell.CurrentDirectory = ScriptDir
WshShell.Run nodeExe & " services\syncDaemon.js", 0, False
