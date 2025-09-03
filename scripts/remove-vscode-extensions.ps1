$codeCmd = 'C:\Users\User\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd'
if(-not (Test-Path $codeCmd)){
  Write-Output "code CLI not found at $codeCmd"; exit 1
}
$exts = @(
  'golang.go',
  'denoland.vscode-deno',
  'dart-code.dart-code',
  'vscjava.vscode-java-upgrade',
  'oven.bun-vscode',
  'blackboxapp.blackbox',
  'blackboxapp.blackboxagent',
  'teamsdevapp.vscode-ai-foundry',
  'saoudrizwan.claude-dev',
  'zencoderai.zencoder',
  'ms-windows-ai-studio.windows-ai-studio'
)
$log = 'C:\\Users\\User\\Downloads\\agro-main\\vscode-uninstall-log.txt'
"Uninstall run: $(Get-Date -Format o)" | Out-File $log -Encoding utf8
foreach($e in $exts){
  "---\nUninstalling: $e" | Out-File $log -Append -Encoding utf8
  try{
    & $codeCmd --uninstall-extension $e 2>&1 | Out-File $log -Append -Encoding utf8
    "ExitCode: $LASTEXITCODE" | Out-File $log -Append -Encoding utf8
  } catch {
    "Error: $_" | Out-File $log -Append -Encoding utf8
  }
}
"\nRemaining extensions list:" | Out-File $log -Append -Encoding utf8
& $codeCmd --list-extensions 2>&1 | Out-File $log -Append -Encoding utf8
"Done." | Out-File $log -Append -Encoding utf8
Write-Output "Wrote $log"
