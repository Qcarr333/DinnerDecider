import { DinnerProvider } from "@/context/DinnerContext";
import Header from "@/components/Header";
import ConversionBanner from "@/components/ConversionBanner";

export default function DinnerLayout({ children }) {
  return (
    <DinnerProvider>
      <Header />
      <ConversionBanner />
      <div className="pt-20">{children}</div>
    </DinnerProvider>
  );
}
