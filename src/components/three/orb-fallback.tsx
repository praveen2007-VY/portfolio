/** Static stand-in for the 3D scene (no WebGL, 3D disabled, or while loading). */
export function OrbFallback({ animate = false }: { animate?: boolean }) {
  return (
    <div aria-hidden className="relative grid size-full place-items-center">
      <div className="relative aspect-square w-[62%]">
        <div
          className="absolute -inset-[18%] rounded-full opacity-70"
          style={{
            background:
              "conic-gradient(from 90deg, transparent 0deg, rgb(var(--accent-rgb) / 0.35) 60deg, transparent 140deg, rgb(90 162 255 / 0.3) 230deg, transparent 320deg)",
            mask: "radial-gradient(circle, transparent 64%, black 65%, black 66%, transparent 67%)",
            WebkitMask: "radial-gradient(circle, transparent 64%, black 65%, black 66%, transparent 67%)",
            animation: animate ? "orb-spin 24s linear infinite" : undefined,
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #ffffff 0%, #f1f5ff 22%, rgb(var(--accent-rgb) / 0.22) 58%, rgb(var(--accent-rgb) / 0.55) 100%)",
            boxShadow:
              "inset -18px -24px 60px rgb(var(--accent-rgb) / 0.35), inset 14px 18px 40px rgb(255 255 255 / 0.9), 0 40px 80px -30px rgb(var(--accent-rgb) / 0.45)",
          }}
        />
        <div className="absolute inset-[30%] rounded-full bg-accent/80 blur-[18px]" />
        <div className="absolute top-[14%] left-[22%] h-[18%] w-[30%] rotate-[-24deg] rounded-full bg-white/80 blur-md" />
      </div>
      <div className="absolute bottom-[6%] h-6 w-[46%] rounded-[100%] bg-[#1b2a55]/15 blur-xl" />
    </div>
  );
}
