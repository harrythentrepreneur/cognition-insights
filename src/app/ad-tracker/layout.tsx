import './ad-tracker.css'
import { BaseTimelinePassiveFix, passiveTouchStyles } from '@/components/shared/base/BaseTimelinePassiveFix'

export default function AdTrackerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BaseTimelinePassiveFix />
      <style dangerouslySetInnerHTML={{ __html: passiveTouchStyles }} />
      <div className="ad-tracker-layout">
        {children}
      </div>
    </>
  )
}
