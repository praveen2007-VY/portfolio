import { CertificateGallery } from "@/components/certificates/certificate-gallery";
import { EmptyState, Section } from "@/components/ui/section";
import type { PortfolioData } from "@/types/portfolio";

export function Certificates({ data }: { data: PortfolioData }) {
  return (
    <Section id="certificates" config={data.settings.sections.certificates}>
      {data.certificates.length === 0 ? (
        <EmptyState title="Certificates will be listed here soon" />
      ) : (
        <CertificateGallery certificates={data.certificates} />
      )}
    </Section>
  );
}
