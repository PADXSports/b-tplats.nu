const DEFAULT_LIBRARIES = ["places"];

let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.google?.maps) return Promise.resolve();

  if (loadPromise) return loadPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"));
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com"]');

    const finish = () => {
      if (window.google?.maps) {
        resolve();
        return;
      }
      loadPromise = null;
      reject(new Error("Google Maps API not available"));
    };

    if (existingScript) {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener(
        "error",
        () => {
          loadPromise = null;
          reject(new Error("Google Maps failed to load"));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => finish();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function loadGoogleMapsScript(apiKey: string, libraries: string[] = DEFAULT_LIBRARIES): Promise<void> {
  void apiKey;
  void libraries;
  return loadGoogleMaps();
}
