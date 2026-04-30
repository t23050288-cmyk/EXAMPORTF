"use client";
// FaceMonitor is disabled in this build (face-api.js not bundled)
export default function FaceMonitor({
  onViolation,
  isSubmitted,
}: {
  onViolation?: (type: string, metadata?: Record<string, unknown>) => void;
  isSubmitted?: boolean;
}) {
  return null;
}
