# Guard de commits para trabajo con varios agentes en paralelo.
#
# Bloquea los comandos git que barren TODO el working tree. Con varios agentes
# escribiendo en el mismo checkout, `git add -A` se lleva puesto el trabajo a
# medio terminar de los demas y lo deploya (main dispara Firebase Hosting).
#
# Recibe el JSON del hook por stdin y responde con permissionDecision=deny.
# Si el comando no es git, sale en silencio con exit 0.

$ErrorActionPreference = 'Stop'

function Deny([string]$motivo, [string]$enCambio) {
    $razon = "$motivo`n`nEn cambio, nombra explicitamente los archivos que TOCASTE VOS:`n  $enCambio`n`nOtro agente puede tener cambios sin commitear en este mismo working tree. Corre 'git status' y commitea solo tus rutas."
    $salida = @{
        hookSpecificOutput = @{
            hookEventName            = 'PreToolUse'
            permissionDecision       = 'deny'
            permissionDecisionReason = $razon
        }
    } | ConvertTo-Json -Depth 5 -Compress
    Write-Output $salida
    exit 0
}

$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

try { $payload = $raw | ConvertFrom-Json } catch { exit 0 }

$cmd = $null
if ($payload.tool_input) { $cmd = $payload.tool_input.command }
if ([string]::IsNullOrWhiteSpace($cmd)) { exit 0 }
if ($cmd -notmatch '\bgit\b') { exit 0 }

# Vacio todo el texto citado ANTES de partir en segmentos. Un mensaje de commit
# es dato, no comando: puede contener saltos de linea, `;` y hasta la frase
# "no uses git add -A" sin que nada de eso sea un comando a analizar.
$limpio = $cmd
$limpio = [regex]::Replace($limpio, "(?s)<<-?\s*'?(\w+)'?.*?\r?\n\1", " HEREDOC ")  # heredoc de bash
$limpio = [regex]::Replace($limpio, "(?s)@(['`"]).*?\1@", " HERESTRING ")            # here-string de PowerShell
$limpio = [regex]::Replace($limpio, '"[^"]*"', '""')
$limpio = [regex]::Replace($limpio, "'[^']*'", "''")

# Recien ahora separo los comandos encadenados (`git add . ; git commit`), para
# no confundir los flags de uno con los del otro.
$segmentos = [regex]::Split($limpio, '(?:&&|\|\||[;&|]|\r?\n)')

foreach ($seg in $segmentos) {
    $flags = $seg.Trim()
    if ($flags -notmatch '\bgit\b') { continue }

    if ($flags -match '\badd\b') {
        if ($flags -match '(?<![\w-])(-A|--all|-u|--update)(?![\w-])') {
            Deny "BLOQUEADO: 'git add' con -A/--all/-u agrega todo el working tree, incluido lo de otros agentes." 'git add src/pages/Reportes.tsx src/components/Loquesea.tsx'
        }
        if ($flags -match '\badd\s+(?:-\S+\s+)*(?:\.|:/|\*)(?:\s|$)') {
            Deny "BLOQUEADO: 'git add .' agrega todo el working tree, incluido lo de otros agentes." 'git add src/pages/Reportes.tsx src/components/Loquesea.tsx'
        }
    }

    if ($flags -match '\bcommit\b') {
        # --all explicito, o un cluster de flags cortos que incluya 'a' (-a, -am,
        # -ma). El lookbehind deja pasar --amend, que no toca el working tree.
        if ($flags -match '(?<![\w-])--all(?![\w-])' -or $flags -match '(?<![\w-])-[a-zA-Z]*a[a-zA-Z]*(?![\w-])') {
            Deny "BLOQUEADO: 'git commit -a/--all' commitea todo lo modificado, incluido lo de otros agentes." 'git add <tus archivos>  ->  git commit -m "..."'
        }
    }

    # Estos no commitean de mas: directamente borran el trabajo sin commitear
    # de los otros agentes. Es la misma clase de accidente.
    if ($flags -match '\breset\b.*(?<![\w-])--hard(?![\w-])') {
        Deny "BLOQUEADO: 'git reset --hard' destruye los cambios sin commitear de TODOS los agentes." 'git restore src/archivo/que/rompiste.tsx'
    }
    if ($flags -match '\b(checkout|restore)\s+(?:-\S+\s+)*\.(?:\s|$)') {
        Deny "BLOQUEADO: descartar '.' revierte el working tree entero, incluido lo de otros agentes." 'git restore src/archivo/que/rompiste.tsx'
    }
    if ($flags -match '\bclean\b.*(?<![\w-])-[a-zA-Z]*f') {
        Deny "BLOQUEADO: 'git clean -f' borra archivos nuevos que otro agente puede estar escribiendo." 'rm src/archivo/puntual.tsx'
    }
}

exit 0
