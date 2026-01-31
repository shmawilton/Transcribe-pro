import { useState, useEffect } from 'react'

// Download URLs
const DOWNLOADS = {
  web: 'https://transcribe-flax.vercel.app/', // Web/PWA app
  windows: 'https://github.com/shmawilton/Transcribe-pro/releases/latest/download/TranscribePro-Setup-1.0.0.exe',
  macosIntel: 'https://github.com/shmawilton/Transcribe-pro/releases/latest/download/TranscribePro-1.0.0.dmg',
  macosArm: 'https://github.com/shmawilton/Transcribe-pro/releases/latest/download/TranscribePro-1.0.0-arm64.dmg',
}

function App() {
  const [activeTab, setActiveTab] = useState<'web' | 'desktop'>('web')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#006b3f" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </div>
          <span style={styles.logoText}>TranscribePro</span>
        </div>
      </header>

      {/* Hero Section */}
      <main style={styles.main}>
        <section style={styles.hero}>
          <h1 style={styles.heroTitle}>
            Professional Transcription
            <span style={styles.heroAccent}> Made Simple</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Transform your audio into text with precision. 
            Available on Web, Windows, and macOS.
          </p>
        </section>

        {/* Platform Selector */}
        <section style={styles.downloadSection}>
          <div style={{
            ...styles.tabContainer,
            ...(isMobile ? styles.tabContainerMobile : {})
          }}>
            <button
              onClick={() => setActiveTab('web')}
              style={{
                ...styles.tab,
                ...(activeTab === 'web' ? styles.tabActive : styles.tabInactive),
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" x2="22" y1="12" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>Web App</span>
            </button>
            <button
              onClick={() => setActiveTab('desktop')}
              style={{
                ...styles.tab,
                ...(activeTab === 'desktop' ? styles.tabActive : styles.tabInactive),
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="14" x="2" y="3" rx="2"/>
                <line x1="8" x2="16" y1="21" y2="21"/>
                <line x1="12" x2="12" y1="17" y2="21"/>
              </svg>
              <span>Desktop</span>
            </button>
          </div>

          {/* Download Cards */}
          <div style={{
            ...styles.cardsContainer,
            ...(isMobile ? styles.cardsContainerMobile : {})
          }}>
            {activeTab === 'web' ? (
              <div style={{
                ...styles.card,
                ...(isMobile ? styles.cardMobile : {})
              }}>
                <div style={styles.cardIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#006b3f" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" x2="22" y1="12" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <h3 style={styles.cardTitle}>Web Application</h3>
                <p style={styles.cardDescription}>
                  Access TranscribePro directly in your browser. Works on any device, 
                  no installation required. Install as PWA for offline access.
                </p>
                <ul style={styles.featureList}>
                  <li style={styles.featureItem}>
                    <span style={styles.checkIcon}>✓</span>
                    Works on any device
                  </li>
                  <li style={styles.featureItem}>
                    <span style={styles.checkIcon}>✓</span>
                    No installation needed
                  </li>
                  <li style={styles.featureItem}>
                    <span style={styles.checkIcon}>✓</span>
                    Install as PWA
                  </li>
                  <li style={styles.featureItem}>
                    <span style={styles.checkIcon}>✓</span>
                    Always up to date
                  </li>
                </ul>
                <a href={DOWNLOADS.web} style={styles.downloadButton}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" x2="21" y1="14" y2="3"/>
                  </svg>
                  Launch Web App
                </a>
              </div>
            ) : (
              <div style={{
                ...styles.desktopCards,
                ...(isMobile ? styles.desktopCardsMobile : {})
              }}>
                {/* Windows Card */}
                <div style={{
                  ...styles.card,
                  ...styles.cardSmall,
                  ...(isMobile ? styles.cardMobile : {})
                }}>
                  <div style={styles.cardIcon}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#006b3f">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                    </svg>
                  </div>
                  <h3 style={styles.cardTitle}>Windows</h3>
                  <p style={styles.cardDescriptionSmall}>
                    Native Windows application with full system integration and auto-updates.
                  </p>
                  <p style={styles.requirements}>Windows 10/11 (64-bit)</p>
                  <a href={DOWNLOADS.windows} style={styles.downloadButton} download>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    Download .exe
                  </a>
                </div>

                {/* macOS Card */}
                <div style={{
                  ...styles.card,
                  ...styles.cardSmall,
                  ...(isMobile ? styles.cardMobile : {})
                }}>
                  <div style={styles.cardIcon}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#006b3f">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                  <h3 style={styles.cardTitle}>macOS</h3>
                  <p style={styles.cardDescriptionSmall}>
                    Native macOS application optimized for Intel and Apple Silicon.
                  </p>
                  <p style={styles.requirements}>macOS 10.15+</p>
                  <div style={styles.macButtonGroup}>
                    <a href={DOWNLOADS.macosArm} style={styles.downloadButton}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" x2="12" y1="15" y2="3"/>
                      </svg>
                      Apple Silicon
                    </a>
                    <a href={DOWNLOADS.macosIntel} style={styles.downloadButtonSecondary}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" x2="12" y1="15" y2="3"/>
                      </svg>
                      Intel
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section style={styles.features}>
          <h2 style={styles.sectionTitle}>Why TranscribePro?</h2>
          <div style={{
            ...styles.featuresGrid,
            ...(isMobile ? styles.featuresGridMobile : {})
          }}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#006b3f" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h4 style={styles.featureTitle}>Multi-Platform</h4>
              <p style={styles.featureText}>One tool, everywhere. Web, Windows, or Mac.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#006b3f" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <h4 style={styles.featureTitle}>Powerful Tools</h4>
              <p style={styles.featureText}>Markers, speed control, pitch adjustment & more.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#006b3f" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h4 style={styles.featureTitle}>Private & Secure</h4>
              <p style={styles.featureText}>Your files stay on your device. Always.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#006b3f" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h4 style={styles.featureTitle}>Auto Updates</h4>
              <p style={styles.featureText}>Desktop apps update automatically.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={styles.footerText}>© 2026 TranscribePro. All rights reserved.</p>
          <div style={styles.footerDivider} />
          <p style={styles.footerVersion}>Version 1.0.0</p>
        </div>
      </footer>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f0f0f3',
  },
  
  // Header
  header: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(145deg, #fafafa, #e6e6e9)',
    boxShadow: '4px 4px 8px rgba(174,174,192,0.4), -4px -4px 8px #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1a1a1a',
    letterSpacing: '-0.02em',
  },

  // Main
  main: {
    flex: 1,
    padding: '0 24px 48px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
  },

  // Hero
  hero: {
    textAlign: 'center' as const,
    padding: '40px 0 48px',
  },
  heroTitle: {
    fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
    fontWeight: 700,
    color: '#1a1a1a',
    lineHeight: 1.2,
    marginBottom: '16px',
  },
  heroAccent: {
    color: '#006b3f',
  },
  heroSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
    color: '#5a5a5a',
    maxWidth: '500px',
    margin: '0 auto',
  },

  // Download Section
  downloadSection: {
    marginBottom: '64px',
  },
  tabContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '32px',
  },
  tabContainerMobile: {
    gap: '8px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    borderRadius: '16px',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  tabActive: {
    background: '#f0f0f3',
    color: '#006b3f',
    boxShadow: 'inset 4px 4px 8px rgba(174,174,192,0.4), inset -4px -4px 8px #ffffff',
  },
  tabInactive: {
    background: 'linear-gradient(145deg, #fafafa, #e6e6e9)',
    color: '#5a5a5a',
    boxShadow: '4px 4px 8px rgba(174,174,192,0.4), -4px -4px 8px #ffffff',
  },

  // Cards
  cardsContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  cardsContainerMobile: {
    padding: '0',
  },
  card: {
    background: 'linear-gradient(145deg, #fafafa, #e6e6e9)',
    boxShadow: '8px 8px 16px rgba(174,174,192,0.4), -8px -8px 16px #ffffff',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center' as const,
  },
  cardMobile: {
    padding: '28px 24px',
    borderRadius: '20px',
  },
  cardSmall: {
    padding: '32px 28px',
    maxWidth: '320px',
  },
  cardIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    background: '#f0f0f3',
    boxShadow: 'inset 3px 3px 6px rgba(174,174,192,0.4), inset -3px -3px 6px #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  cardTitle: {
    fontSize: '1.35rem',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '12px',
  },
  cardDescription: {
    fontSize: '0.95rem',
    color: '#5a5a5a',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  cardDescriptionSmall: {
    fontSize: '0.9rem',
    color: '#5a5a5a',
    lineHeight: 1.5,
    marginBottom: '12px',
  },
  featureList: {
    listStyle: 'none',
    textAlign: 'left' as const,
    marginBottom: '24px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
    fontSize: '0.9rem',
    color: '#1a1a1a',
  },
  checkIcon: {
    color: '#006b3f',
    fontWeight: 700,
  },
  requirements: {
    fontSize: '0.8rem',
    color: '#8a8a8a',
    marginBottom: '20px',
  },
  downloadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 24px',
    borderRadius: '14px',
    background: '#006b3f',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    boxShadow: '4px 4px 12px rgba(0,107,63,0.3)',
  },
  downloadButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 24px',
    borderRadius: '14px',
    background: 'linear-gradient(145deg, #fafafa, #e6e6e9)',
    color: '#006b3f',
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    boxShadow: '4px 4px 8px rgba(174,174,192,0.4), -4px -4px 8px #ffffff',
    border: '2px solid #006b3f',
  },
  macButtonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  desktopCards: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  desktopCardsMobile: {
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
  },

  // Features Section
  features: {
    padding: '32px 0',
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
    fontWeight: 600,
    color: '#1a1a1a',
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
  },
  featuresGridMobile: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  featureCard: {
    background: 'linear-gradient(145deg, #fafafa, #e6e6e9)',
    boxShadow: '6px 6px 12px rgba(174,174,192,0.4), -6px -6px 12px #ffffff',
    borderRadius: '18px',
    padding: '24px 16px',
    textAlign: 'center' as const,
  },
  featureIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: '#f0f0f3',
    boxShadow: 'inset 2px 2px 4px rgba(174,174,192,0.4), inset -2px -2px 4px #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
  },
  featureTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '6px',
  },
  featureText: {
    fontSize: '0.8rem',
    color: '#5a5a5a',
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    padding: '24px',
    marginTop: 'auto',
  },
  footerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  footerText: {
    fontSize: '0.85rem',
    color: '#8a8a8a',
  },
  footerDivider: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#d1d1d6',
  },
  footerVersion: {
    fontSize: '0.85rem',
    color: '#8a8a8a',
  },
}

export default App
