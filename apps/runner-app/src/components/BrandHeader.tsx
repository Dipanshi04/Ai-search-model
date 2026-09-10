import logoDark from './logo-dark.png';
import nrcGroupLogo from './nrc-group-logo.png';
import solugenixLogo from './solugenix-logo.png';
import SponsorTicker from './SponsorTicker';

// NRC Group (main sponsor) + ISA logo lockup, plus the co-sponsor logo —
// same pairing used on the public site's page headers, shrunk down for
// the phone-sized runner app.
export default function BrandHeader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 16px 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '8px 12px', border: '1px solid #e2e8f0' }}>
          <img src={nrcGroupLogo} alt="NRC Group" style={{ height: '44px', width: 'auto', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '8px 12px', border: '1px solid #e2e8f0' }}>
          <img src={logoDark} alt="ISA Marathon" style={{ height: '44px', width: 'auto', objectFit: 'contain', display: 'block' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1B2A5B', opacity: 0.45 }}>
          Co-Sponsored By
        </span>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '7px 12px', border: '1px solid #e2e8f0' }}>
          <img src={solugenixLogo} alt="Solugenix" style={{ height: '22px', width: 'auto', objectFit: 'contain', display: 'block' }} />
        </div>
      </div>
      <SponsorTicker />
    </div>
  );
}
