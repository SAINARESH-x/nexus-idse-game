// Stage 3 challenge: assemble two functions from ordered blocks, run hidden tests and reuse them in a loop.
import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, Play, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { runFunctionBlocks, runFunctionTests } from './engine'
import type { FunctionTestResult, Packet } from './engine'
import {
  L02_FUNCTION_BLOCKS,
  L02_FUNCTION_NAMES,
  L02_FUNCTION_PARAMETERS,
  L02_FUNCTION_TESTS,
  L02_REUSE_PACKETS,
} from './content'
import type { FunctionBlockId, FunctionBlockDef, FunctionKind } from './content'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const KINDS: FunctionKind[] = ['is_valid', 'risk_score']

interface FunctionConfig {
  name: string
  parameter: string
  blocks: FunctionBlockId[]
}

const initialConfig = (kind: FunctionKind): FunctionConfig => ({
  name: L02_FUNCTION_NAMES[kind][0],
  parameter: L02_FUNCTION_PARAMETERS[kind][0],
  blocks: [],
})

const displayValue = (value: boolean | number | null) => {
  if (value === null) return '—'
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  return String(value)
}

const blockById = (kind: FunctionKind, id: FunctionBlockId): FunctionBlockDef | undefined =>
  L02_FUNCTION_BLOCKS[kind].find((block) => block.id === id)

const toFunctionCode = (kind: FunctionKind, config: FunctionConfig): string => {
  const header = `def ${config.name}(${config.parameter}):`
  const body: string[] = []
  for (const id of config.blocks) {
    const block = blockById(kind, id)
    if (!block) continue
    body.push(...block.code.split('\n').map((line) => `    ${line}`))
  }
  return [header, ...(body.length > 0 ? body : ['    pass'])].join('\n')
}

export function FunctionForgeChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [active, setActive] = useState<FunctionKind>('is_valid')
  const [configs, setConfigs] = useState<Record<FunctionKind, FunctionConfig>>({
    is_valid: initialConfig('is_valid'),
    risk_score: initialConfig('risk_score'),
  })
  const [results, setResults] = useState<Record<FunctionKind, FunctionTestResult[] | null>>({
    is_valid: null,
    risk_score: null,
  })
  const [passed, setPassed] = useState<Record<FunctionKind, boolean>>({ is_valid: false, risk_score: false })
  const [failedRuns, setFailedRuns] = useState(0)
  const [reuse, setReuse] = useState<Array<{ packet: Packet; value: boolean | number | null }> | null>(null)
  const finished = useRef(false)

  const config = configs[active]

  const patchConfig = (kind: FunctionKind, patch: Partial<FunctionConfig>) => {
    setConfigs((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }))
    setPassed((current) => ({ ...current, [kind]: false }))
    setResults((current) => ({ ...current, [kind]: null }))
    setReuse(null)
  }

  const addBlock = (kind: FunctionKind, blockId: FunctionBlockId) => {
    if (configs[kind].blocks.includes(blockId)) return
    patchConfig(kind, { blocks: [...configs[kind].blocks, blockId] })
  }

  const removeBlock = (kind: FunctionKind, index: number) => {
    patchConfig(kind, { blocks: configs[kind].blocks.filter((_, position) => position !== index) })
  }

  const moveBlock = (kind: FunctionKind, index: number, delta: number) => {
    const target = index + delta
    const blocks = [...configs[kind].blocks]
    if (target < 0 || target >= blocks.length) return
    const [item] = blocks.splice(index, 1)
    blocks.splice(target, 0, item)
    patchConfig(kind, { blocks })
  }

  const runTests = (kind: FunctionKind) => {
    const current = configs[kind]
    let nextResults: FunctionTestResult[]
    if (current.name !== kind || current.parameter !== 'packet') {
      nextResults = L02_FUNCTION_TESTS[kind].map((test) => ({
        id: test.id,
        packet: test.packet,
        expected: test.expected,
        actual: null,
        pass: false,
        error: `Hidden tests call ${kind}(packet); your signature is ${current.name}(${current.parameter})`,
      }))
    } else {
      nextResults = runFunctionTests(current.blocks, L02_FUNCTION_TESTS[kind])
    }
    const allPass = nextResults.length > 0 && nextResults.every((result) => result.pass)
    const nextPassed = { ...passed, [kind]: allPass }
    setResults((currentResults) => ({ ...currentResults, [kind]: nextResults }))
    setPassed(nextPassed)

    if (allPass) {
      decisions.current.push({
        label: `${kind} passed all hidden tests`,
        good: true,
        explanation:
          kind === 'is_valid'
            ? 'Validity requires a good checksum and a size above zero; the guard returns False before the final return.'
            : 'The score is size_kb / 100, with a +2 bonus returned early for high-priority packets.',
      })
      ui.log({ title: `${kind} passed`, detail: 'Every hidden case returned the expected value.', tone: 'good' })
      if (nextPassed.is_valid && nextPassed.risk_score) ui.completeObjective('l2-obj-functions')
    } else {
      setFailedRuns((currentFailures) => currentFailures + 1)
      const failure = nextResults.find((result) => !result.pass)
      decisions.current.push({
        label: `${kind} failed a hidden test`,
        good: false,
        explanation: failure
          ? `${failure.id}: expected ${displayValue(failure.expected)}, got ${displayValue(failure.actual)}${failure.error ? ` (${failure.error})` : ''}.`
          : 'The function did not pass.',
      })
      ui.log({
        title: `${kind} test run failed`,
        detail: failure
          ? `${failure.id}: expected ${displayValue(failure.expected)}, got ${displayValue(failure.actual)}${failure.error ? ` (${failure.error})` : ''}.`
          : 'No test passed.',
        tone: 'bad',
      })
    }
  }

  const runReuse = () => {
    if (!passed.is_valid || !passed.risk_score) return
    const rows = L02_REUSE_PACKETS.map((packet) => ({
      packet,
      value: runFunctionBlocks(configs.is_valid.blocks, packet).value,
    }))
    setReuse(rows)
    ui.log({
      title: 'Functions reused in a loop',
      detail: `is_valid(packet) called ${rows.length} times without repeating the logic.`,
      tone: 'good',
    })
  }

  const finish = () => {
    if (finished.current || !reuse) return
    finished.current = true
    decisions.current.push({
      label: 'Functions called in a reuse loop',
      good: true,
      explanation:
        'The same function body handled every packet. Reuse keeps one rule in one place, so a fix reaches every call site.',
    })
    onComplete({
      id,
      accuracy: 1,
      decisionQuality: clamp01(1 / (1 + failedRuns)),
      efficiency: clamp01(Math.max(0.3, 2 / (2 + failedRuns))),
      hintsUsed: 0,
      mistakes: failedRuns,
      decisions: decisions.current,
      extra: {
        zeroRetries: failedRuns === 0,
        functionsPassed: 2,
        reuseCalls: L02_REUSE_PACKETS.length,
        failedRuns,
      },
    })
  }

  const bothPassed = passed.is_valid && passed.risk_score

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActive(kind)}
            className={cn(
              'rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]',
              active === kind ? 'border-cyan/60 bg-cyan/[0.06] text-cyan' : 'border-border bg-panel2/50 text-muted',
            )}
          >
            {kind}
            {passed[kind] && <CheckCircle2 size={12} className="ml-1 inline text-green" aria-label="passed" />}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel2/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Signature</p>
          <label className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            function name
            <select
              value={config.name}
              onChange={(event) => patchConfig(active, { name: event.target.value })}
              className="mt-1 h-9 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
            >
              {L02_FUNCTION_NAMES[active].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            parameter
            <select
              value={config.parameter}
              onChange={(event) => patchConfig(active, { parameter: event.target.value })}
              className="mt-1 h-9 w-full rounded border border-border bg-panel px-2 font-mono text-[11px] text-text"
            >
              {L02_FUNCTION_PARAMETERS[active].map((parameter) => (
                <option key={parameter} value={parameter}>
                  {parameter}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            hidden tests call {active}(packet)
          </p>
        </div>

        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Generated Python</p>
          <pre className="overflow-auto rounded border border-border bg-bg/80 p-3 font-mono text-[11px] leading-relaxed text-cyan/90">
            {toFunctionCode(active, config)}
          </pre>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel2/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Body blocks</p>
          <div className="mt-2 space-y-1.5">
            {config.blocks.length === 0 && (
              <p className="rounded border border-dashed border-border p-2 text-[11px] text-muted">
                Empty body. Add a compute block, a guard and a return.
              </p>
            )}
            {config.blocks.map((blockId, index) => {
              const block = blockById(active, blockId)
              return (
                <div key={blockId} className="flex items-start gap-1.5 rounded border border-border bg-panel/70 p-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">{index + 1}</span>
                  <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[10px] text-text">
                    {block?.code ?? blockId}
                  </pre>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveBlock(active, index, -1)}
                      disabled={index === 0}
                      aria-label={`Move block ${index + 1} up`}
                      className="rounded border border-border p-0.5 text-muted hover:text-cyan disabled:opacity-30"
                    >
                      <ArrowUp size={10} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(active, index, 1)}
                      disabled={index === config.blocks.length - 1}
                      aria-label={`Move block ${index + 1} down`}
                      className="rounded border border-border p-0.5 text-muted hover:text-cyan disabled:opacity-30"
                    >
                      <ArrowDown size={10} aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBlock(active, index)}
                    aria-label={`Remove block ${index + 1}`}
                    className="rounded border border-border p-1 text-muted hover:text-red"
                  >
                    <Trash2 size={11} aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Add block</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {L02_FUNCTION_BLOCKS[active].map((block) => (
              <button
                key={block.id}
                type="button"
                disabled={config.blocks.includes(block.id)}
                onClick={() => addBlock(active, block.id)}
                className="rounded border border-border bg-panel px-2 py-1 font-mono text-[9px] text-muted hover:border-cyan/60 hover:text-cyan disabled:opacity-30"
              >
                <Plus size={9} className="mr-1 inline" aria-hidden="true" />
                {block.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Hidden test cases</p>
            <NeonButton size="sm" onClick={() => runTests(active)} data-testid="btn-run-function">
              <Play size={12} aria-hidden="true" />
              Run hidden tests
            </NeonButton>
          </div>
          <div className="mt-2 overflow-auto rounded border border-border">
            <table className="w-full min-w-[360px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-panel2/60 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  <th className="px-2 py-1.5">case</th>
                  <th className="px-2 py-1.5">input</th>
                  <th className="px-2 py-1.5">expected</th>
                  <th className="px-2 py-1.5">actual</th>
                  <th className="px-2 py-1.5">result</th>
                </tr>
              </thead>
              <tbody>
                {L02_FUNCTION_TESTS[active].map((test) => {
                  const result = results[active]?.find((item) => item.id === test.id)
                  return (
                    <tr key={test.id} className="border-b border-border/40 font-mono text-[10px]">
                      <td className="px-2 py-1 text-text">{test.id}</td>
                      <td className="px-2 py-1 text-muted">
                        size {test.packet.size_kb} · {test.packet.source} ·{' '}
                        {test.packet.checksum_ok ? 'checksum ok' : 'checksum bad'} · {test.packet.priority}
                      </td>
                      <td className="px-2 py-1 text-cyan">{displayValue(test.expected)}</td>
                      <td className={cn('px-2 py-1', result?.pass ? 'text-green' : 'text-red')}>
                        {result ? displayValue(result.actual) : '—'}
                      </td>
                      <td className="px-2 py-1">
                        {!result ? (
                          <Badge tone="muted">pending</Badge>
                        ) : result.pass ? (
                          <CheckCircle2 size={12} className="text-green" aria-label="pass" />
                        ) : (
                          <span title={result.error ?? undefined}>
                            <XCircle size={12} className="text-red" aria-label="fail" />
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {results[active]?.some((result) => !result.pass && result.error) && (
            <p className="mt-2 rounded border border-red/40 bg-red/[0.05] p-2 font-mono text-[10px] text-red" aria-live="polite">
              {results[active]?.find((result) => !result.pass && result.error)?.error}
            </p>
          )}
        </div>
      </div>

      <div className="rounded border border-border bg-panel2/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Reuse loop · 20 packets</p>
          <Badge tone={bothPassed ? 'green' : 'muted'}>{bothPassed ? 'Functions ready' : 'Pass both functions first'}</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Once both functions pass, call <span className="font-mono text-cyan">is_valid(packet)</span> inside a loop. The
          logic is written once and reused for every packet.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <NeonButton size="sm" onClick={runReuse} disabled={!bothPassed} data-testid="btn-run-reuse">
            <RefreshCw size={12} aria-hidden="true" />
            Run 20 calls
          </NeonButton>
          <NeonButton size="sm" variant="primary" onClick={finish} disabled={!reuse} data-testid="btn-log-functions">
            Log stage
          </NeonButton>
          <span className="self-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            failed runs: {failedRuns}
          </span>
        </div>
        {reuse && (
          <div className="mt-3 max-h-48 overflow-auto rounded border border-border">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-panel2/60 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  <th className="px-2 py-1.5">packet</th>
                  <th className="px-2 py-1.5">size</th>
                  <th className="px-2 py-1.5">checksum</th>
                  <th className="px-2 py-1.5">is_valid(packet)</th>
                </tr>
              </thead>
              <tbody>
                {reuse.map((row) => (
                  <tr key={row.packet.id} className="border-b border-border/40 font-mono text-[10px]">
                    <td className="px-2 py-1 text-text">{row.packet.id}</td>
                    <td className="px-2 py-1 text-muted">{row.packet.size_kb}</td>
                    <td className="px-2 py-1 text-muted">{row.packet.checksum_ok ? 'ok' : 'bad'}</td>
                    <td className="px-2 py-1 text-cyan">{displayValue(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
