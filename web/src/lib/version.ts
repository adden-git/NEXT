declare const __NEXUS_VERSION__: string | undefined;

export const nexusVersion =
  typeof __NEXUS_VERSION__ !== "undefined" && __NEXUS_VERSION__
    ? __NEXUS_VERSION__
    : "dev";
