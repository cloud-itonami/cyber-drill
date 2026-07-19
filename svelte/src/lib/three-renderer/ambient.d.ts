// Vendor-local ambient declarations for the three-renderer dir.
//
// The previous home of this code (`@etzhayyim/kami-engine-sdk/src/ambient.d.ts`)
// shipped minimal WebXR + SpeechSynthesis shims so the SDK type-checked
// without pulling @types/webxr. That ambient block was removed on
// 2026-05-26 when the SDK went three-free; the consumer (this vendor app)
// now carries its own shims.
//
// Apps with their own @types/webxr installed will override these via
// interface merging.

interface XRSession extends EventTarget {
  end(): Promise<void>;
}
interface XRSystem {
  isSessionSupported(mode: string): Promise<boolean>;
  requestSession(
    mode: string,
    init?: { optionalFeatures?: string[]; requiredFeatures?: string[] },
  ): Promise<XRSession>;
}
interface Navigator {
  xr?: XRSystem;
}
