import Banner from "@/components/Banner";
import { DEFAULT_PROMO_BANNER } from "@/lib/promo-banner";

/** @deprecated 신규 코드는 components/Banner.tsx 사용 */
export default function PromoFooterBanner() {
  return (
    <Banner
      title={DEFAULT_PROMO_BANNER.title}
      buttonText={DEFAULT_PROMO_BANNER.buttonText}
      buttonUrl={DEFAULT_PROMO_BANNER.buttonUrl}
    />
  );
}
