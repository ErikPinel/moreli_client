import { useBeforeUnload, useBlocker } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function UnsavedChangesDialog({ when }: { when: boolean }) {
  const blocker = useBlocker(when)
  useBeforeUnload(event => {
    if (when) { event.preventDefault(); event.returnValue = '' }
  })
  return <Dialog open={blocker.state === 'blocked'} onOpenChange={open => { if (!open && blocker.state === 'blocked') blocker.reset() }}>
    <DialogContent dir="rtl"><DialogHeader><DialogTitle>לצאת בלי לשמור?</DialogTitle><DialogDescription>השינויים עדיין לא נשלחו. אפשר להישאר בעמוד ולשמור אותם לפני היציאה.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => { if (blocker.state === 'blocked') blocker.reset() }}>להישאר ולערוך</Button><Button type="button" variant="destructive" onClick={() => { if (blocker.state === 'blocked') blocker.proceed() }}>יציאה מהעמוד</Button></DialogFooter></DialogContent>
  </Dialog>
}