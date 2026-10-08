export const dynamic = 'force-dynamic';

import "@/styles/auth-tailwind.css"

// Critical CSS to prevent layout shift
const criticalCSS = `
  @media (min-width: 1024px) {
    .lg\\:items-center { align-items: center; }
    .lg\\:self-center { align-self: center; }
    .lg\\:text-center { text-align: center; }
    .lg\\:mx-auto { margin-left: auto; margin-right: auto; }
    .lg\\:px-4 { padding-left: 1rem; padding-right: 1rem; }
  }
`

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      <div className="auth-container">
        {children}
      </div>
    </>
  )
}