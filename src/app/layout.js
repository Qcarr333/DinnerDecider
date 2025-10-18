import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import BetaBanner from "@/components/BetaBanner";

export const metadata = {
  title: "DinnerDecider",
  description: "Quickly pick where to eat",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content="DinnerDecider helps you pick where to eat in two fun random spins — no arguments, just food." />
        <meta name="keywords" content="food, restaurant picker, dinner wheel, where to eat app, date night ideas" />
        <meta property="og:title" content="DinnerDecider – Stop Arguing, Start Eating" />
        <meta property="og:description" content="Spin twice to find the perfect place to eat near you." />
        <meta property="og:image" content="/og-dinnerdecider.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "DinnerDecider",
              url: "https://dinnerdecider.app",
              applicationCategory: "FoodOrderingApp",
              description:
                "DinnerDecider helps you pick where to eat in two fun random spins — no arguments, just food.",
              operatingSystem: "Web",
            }),
          }}
        />
      </head>
      <body>
        <BetaBanner />
        <Analytics />
        <SpeedInsights />
        {children}
      </body>
    </html>
  );
}
