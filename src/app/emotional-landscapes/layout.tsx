import './emotional-landscapes.css'
import { BaseTimelinePassiveFix, passiveTouchStyles } from '@/components/shared/base/BaseTimelinePassiveFix'

export default function EmotionalLandscapesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BaseTimelinePassiveFix />
      <style dangerouslySetInnerHTML={{ __html: passiveTouchStyles }} />
      <div className="emotional-landscapes-layout">
        {children}
      </div>
    </>
  )
}