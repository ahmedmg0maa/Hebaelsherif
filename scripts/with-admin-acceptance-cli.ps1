param([string]$ScriptPath='scripts/check-admin-acceptance-environment.mjs',[string[]]$ScriptArguments)
$ErrorActionPreference='Stop'
# Only the current CLI login is inherited. Never load production .env.local.
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AcceptanceCliCredential {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct Cred {public uint Flags,Type;public string TargetName,Comment;public long LastWritten;public uint Size;public IntPtr Blob;public uint Persist,Count;public IntPtr Attributes;public string Alias,User;}
 [DllImport("advapi32.dll",EntryPoint="CredReadW",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool Read(string name,uint type,uint flags,out IntPtr p);
 [DllImport("advapi32.dll")] static extern void CredFree(IntPtr p);
 public static string Get(){IntPtr p;if(!Read("Supabase CLI:supabase",1,0,out p))throw new Exception("CLI_LOGIN_UNAVAILABLE");try{var c=(Cred)Marshal.PtrToStructure(p,typeof(Cred));var b=new byte[c.Size];Marshal.Copy(c.Blob,b,0,b.Length);return System.Text.Encoding.UTF8.GetString(b);}finally{CredFree(p);}}
}
'@
$previous=$env:SUPABASE_ACCESS_TOKEN
try {$env:SUPABASE_ACCESS_TOKEN=[AcceptanceCliCredential]::Get(); & node $ScriptPath @ScriptArguments; exit $LASTEXITCODE}
finally {if($null -eq $previous){Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue}else{$env:SUPABASE_ACCESS_TOKEN=$previous}}
