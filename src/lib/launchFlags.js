export function getFlags() {
  return {
    beta: String(process.env.NEXT_PUBLIC_BETA_MODE || "").toLowerCase() === "true",
    launchDate: process.env.NEXT_PUBLIC_LAUNCH_DATE || "",
    launchChannels: (process.env.NEXT_PUBLIC_LAUNCH_CHANNELS || "").split(/\s*,\s*/).filter(Boolean),
  };
}

