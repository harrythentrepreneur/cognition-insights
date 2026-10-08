import React from 'react';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage: number;
  limit: number;
  isWarning: boolean;
}

export default function RateLimitModal({ 
  isOpen, 
  onClose, 
  currentUsage, 
  limit,
  isWarning 
}: RateLimitModalProps) {
  if (!isOpen) return null;

  const isBlocked = currentUsage >= limit;
  const remaining = Math.max(0, limit - currentUsage);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      opacity: isOpen ? 1 : 0,
      transition: 'opacity 0.3s ease',
      backdropFilter: 'blur(5px)',
    }}>
      <div style={{
        backgroundColor: '#F5F2F0',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        transform: isOpen ? 'scale(1)' : 'scale(0.95)',
        transition: 'transform 0.3s ease',
        fontFamily: '"Inter", sans-serif',
      }}>
        {/* Icon */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: isBlocked ? '#dc3545' : '#f39c12',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 9V13M12 17H12.01M12 3L2 20H22L12 3Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'rgb(61, 0, 0)',
          textAlign: 'center',
          marginBottom: '16px',
          fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
        }}>
          {isBlocked ? 'Account Limit Reached' : 'Almost at Your Limit!'}
        </h2>

        {/* Message */}
        <p style={{
          fontSize: '16px',
          color: 'rgba(61, 0, 0, 0.8)',
          textAlign: 'center',
          lineHeight: '1.6',
          marginBottom: '24px',
        }}>
          {isBlocked ? (
            <>
              You've reached the {limit} report limit on your account. We set this limit to protect our 
              service from automated misuse and keep costs sustainable. We know you're using Cognition 
              genuinely, and if you need a few more reports, just email us - we'll happily add more to 
              your account. It takes just a minute.
            </>
          ) : (
            <>
              You've used {currentUsage} of your {limit} reports. Just a heads up - we limit accounts to 
              {limit} reports to prevent automated abuse and keep our infrastructure costs manageable. 
              You have {remaining} {remaining !== 1 ? 'reports' : 'report'} left. If you run out and need more, 
              just drop us an email. We're happy to add more for genuine users like you.
            </>
          )}
        </p>

        {/* Usage indicator */}
        <div style={{
          backgroundColor: 'rgba(61, 0, 0, 0.05)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '14px',
            color: 'rgba(61, 0, 0, 0.6)',
          }}>
            <span>Lifetime Usage</span>
            <span>{currentUsage} / {limit}</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(61, 0, 0, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(currentUsage / limit) * 100}%`,
              height: '100%',
              backgroundColor: currentUsage >= limit ? '#dc3545' : 
                              currentUsage >= 5 ? '#f39c12' : '#00d4aa',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Support contact */}
        {isBlocked && (
          <div style={{
            backgroundColor: 'rgba(61, 0, 0, 0.05)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '14px',
              color: 'rgba(61, 0, 0, 0.6)',
              marginBottom: '8px',
            }}>
              Ready for more reports? Just send us a quick email:
            </p>
            <a
              href="mailto:support@cognition.cv"
              style={{
                color: 'rgb(61, 0, 0)',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              support@cognition.cv
            </a>
            <p style={{
              fontSize: '13px',
              color: 'rgba(61, 0, 0, 0.5)',
              marginTop: '8px',
            }}>
              We'll add more reports to your account right away
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: isBlocked ? 'rgb(61, 0, 0)' : 'transparent',
              color: isBlocked ? 'white' : 'rgb(61, 0, 0)',
              border: isBlocked ? 'none' : '2px solid rgb(61, 0, 0)',
              borderRadius: '187px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
              transition: 'all 0.3s ease',
              minWidth: '120px',
            }}
            onMouseEnter={(e) => {
              if (isBlocked) {
                e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.9)';
              } else {
                e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (isBlocked) {
                e.currentTarget.style.backgroundColor = 'rgb(61, 0, 0)';
              } else {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {isBlocked ? 'Understood' : 'Got it!'}
          </button>
          
          {!isBlocked && (
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgb(61, 0, 0)',
                color: 'white',
                border: 'none',
                borderRadius: '187px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: '"Satoshi", "Satoshi Placeholder", sans-serif',
                transition: 'all 0.3s ease',
                minWidth: '160px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(61, 0, 0, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(61, 0, 0)';
              }}
            >
              Continue Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}