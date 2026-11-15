// Level 04 briefing actions: CONTINUE MISSION for an unfinished session, BEGIN MISSION (with discard confirm) otherwise.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, RotateCcw } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { NeonButton } from '../../ui/NeonButton'
import { clearRecord, hasActiveRecord } from './missionRecord'

export function BriefingActions() {
  const navigate = useNavigate()
  const [active] = useState(() => hasActiveRecord())
  const [confirm, setConfirm] = useState(false)
  if (!active) {
    return (
      <NeonButton size="lg" data-testid="btn-begin-mission" onClick={() => navigate('/level/4/play')}>
        <Play size={15} aria-hidden="true" /> Begin mission
      </NeonButton>
    )
  }
  return (
    <>
      <NeonButton size="lg" data-testid="btn-continue-mission" onClick={() => navigate('/level/4/play')}>
        <Play size={15} aria-hidden="true" /> Continue mission
      </NeonButton>
      <NeonButton variant="ghost" size="lg" data-testid="btn-begin-mission" onClick={() => setConfirm(true)}>
        <RotateCcw size={15} aria-hidden="true" /> Begin mission
      </NeonButton>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Discard the unfinished mission?"
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setConfirm(false)}>Keep it</NeonButton>
            <NeonButton variant="danger" data-testid="btn-discard-confirm" onClick={() => { clearRecord(); navigate('/level/4/play') }}>Discard and choose a tier</NeonButton>
          </>
        }
      >
        <p>Your saved progress on this vault is deleted. A new attempt starts when you confirm a clearance tier.</p>
      </Modal>
    </>
  )
}
