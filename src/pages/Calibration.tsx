import { useState } from 'react'
import { CalibrationEventsList, CalibrationWorkflow } from '@/components/calibration'
import type { CalibrationEvent } from '@/types'

export function CalibrationPage() {
  const [selectedEvent, setSelectedEvent] = useState<CalibrationEvent | null>(null)

  if (selectedEvent) {
    return (
      <CalibrationWorkflow
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
      />
    )
  }

  return <CalibrationEventsList onSelectEvent={setSelectedEvent} />
}
