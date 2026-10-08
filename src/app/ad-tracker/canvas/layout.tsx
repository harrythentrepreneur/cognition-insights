import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ad Creation Lab | Canvas',
  description: 'Node-based infinite canvas for building performance-driven ad scripts',
};

export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#0a0a14',
    }}>
      {children}
    </div>
  );
}
