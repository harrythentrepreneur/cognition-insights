'use client';

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 700;
        }
        
        @font-face {
          font-family: 'Satoshi';
          src: url('https://framerusercontent.com/third-party-assets/fontshare/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7AHDUZ4A7LFLVFUIFSARGIWCRQJHISQP.woff2') format('woff2');
          font-display: swap;
          font-style: normal;
          font-weight: 500;
        }

        .signup-container {
          background: linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #1A1A2E 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease-in-out infinite;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Custom Clerk component styling */
        :global(.cl-signUp-root) {
          font-family: 'Inter', sans-serif !important;
          background: rgba(255, 255, 255, 0.05) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 16px !important;
          padding: 2rem !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        }

        :global(.cl-signUp-root h1) {
          font-family: 'Satoshi', sans-serif !important;
          font-weight: 700 !important;
          color: #FFFFFF !important;
          font-size: 1.75rem !important;
          line-height: 1.2 !important;
          margin-bottom: 0.5rem !important;
        }

        :global(.cl-signUp-root h2) {
          font-family: 'Satoshi', sans-serif !important;
          font-weight: 500 !important;
          color: #A0A0B0 !important;
          font-size: 1rem !important;
          line-height: 1.4 !important;
          margin-bottom: 1.5rem !important;
        }

        :global(.cl-signUp-root label) {
          font-family: 'Inter', sans-serif !important;
          font-weight: 500 !important;
          color: #E0E0E0 !important;
          font-size: 0.875rem !important;
          margin-bottom: 0.5rem !important;
        }

        :global(.cl-signUp-root input) {
          font-family: 'Inter', sans-serif !important;
          font-weight: 400 !important;
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px !important;
          color: #FFFFFF !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.875rem !important;
          transition: all 0.2s ease !important;
        }

        :global(.cl-signUp-root input:focus) {
          outline: none !important;
          border-color: #7A5CFA !important;
          box-shadow: 0 0 0 3px rgba(122, 92, 250, 0.1) !important;
        }

        :global(.cl-signUp-root button) {
          font-family: 'Inter', sans-serif !important;
          font-weight: 600 !important;
          background: linear-gradient(135deg, #7A5CFA 0%, #8B5CF6 100%) !important;
          border: none !important;
          border-radius: 8px !important;
          color: #FFFFFF !important;
          padding: 0.75rem 1.5rem !important;
          font-size: 0.875rem !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        :global(.cl-signUp-root button:hover) {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(122, 92, 250, 0.3) !important;
        }

        :global(.cl-signUp-root button:active) {
          transform: translateY(0) !important;
        }

        :global(.cl-signUp-root a) {
          color: #7A5CFA !important;
          text-decoration: none !important;
          font-weight: 500 !important;
          transition: color 0.2s ease !important;
        }

        :global(.cl-signUp-root a:hover) {
          color: #8B5CF6 !important;
        }

        :global(.cl-signUp-root .cl-dividerLine) {
          background: rgba(255, 255, 255, 0.2) !important;
        }

        :global(.cl-signUp-root .cl-dividerText) {
          color: #A0A0B0 !important;
          font-size: 0.875rem !important;
        }
      `}</style>

      <div className="signup-container">
        <SignUp 
          forceRedirectUrl="/welcome"
          signInForceRedirectUrl="/welcome"
        />
      </div>
    </>
  )
}