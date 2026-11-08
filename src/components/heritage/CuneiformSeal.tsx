import { SEAL_SIGNS_A, SEAL_SIGNS_B } from './seal-signs';

function Signs({ signs }: { signs: string }) {
  return (
    <>
      {Array.from(signs).map((sign, index) => (
        <span key={index}>{sign}</span>
      ))}
    </>
  );
}

/**
 * Two counter-moving bands of Sumerian cuneiform between gold rules — a rolled
 * cylinder-seal impression. Decorative (aria-hidden).
 *
 * Why it always renders: the track is forced `direction: ltr` (the page is RTL, which
 * flips flex/transform math), the sign row is duplicated for a seamless -50% loop, and
 * the glyphs come from the subset font embedded in `heritage.css`.
 * Motion is disabled under `prefers-reduced-motion`.
 */
export function CuneiformSeal({ className }: { className?: string }) {
  return (
    <div className={['hx-seal', className].filter(Boolean).join(' ')} aria-hidden="true">
      <div className="hx-seal-band">
        <div className="hx-track">
          <div>
            <Signs signs={SEAL_SIGNS_A} />
          </div>
          <div>
            <Signs signs={SEAL_SIGNS_A} />
          </div>
        </div>
      </div>
      <div className="hx-seal-twist" />
      <div className="hx-seal-band">
        <div className="hx-track hx-rev">
          <div>
            <Signs signs={SEAL_SIGNS_B} />
          </div>
          <div>
            <Signs signs={SEAL_SIGNS_B} />
          </div>
        </div>
      </div>
    </div>
  );
}
