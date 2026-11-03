import { CertificateGallery } from "@/components/certificates/certificate-gallery";
import { EmptyState, Section } from "@/components/ui/section";
import type { PortfolioData } from "@/types/portfolio";

export function Certificates({ data }: { data: PortfolioData }) {
  return (
    <Section id="certificates" config={data.settings.sections.certificates} className="relative">
      {/* Subtle ambient lighting for light mode */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[440px] w-full max-w-5xl -translate-x-1/2 bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(37,99,235,0.08),transparent_70%)] dark:hidden"
      />
      {data.certificates.length === 0 ? (
        <EmptyState title="Certificates will be listed here soon" />
      ) : (
        <CertificateGallery certificates={data.certificates} />
      )}
    </Section>
  );
}
