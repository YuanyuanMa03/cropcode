/** Help links come from the CropCode configuration bundled with the app. */
export function createDesktopHelpConfigReader(_options: {
  resolveEndpointOrigin: () => Promise<string>;
  appVersion: string;
  deviceMid: string;
}) {
  return async () => undefined;
}
