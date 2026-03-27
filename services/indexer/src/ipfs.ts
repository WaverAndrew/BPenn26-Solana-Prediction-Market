const IPFS_GATEWAY = process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetches content from an IPFS URI.
 * Accepts formats: ipfs://<cid>, ipfs://<cid>/<path>, or raw CID strings.
 * Falls back to treating the input as a full URL if it starts with http.
 */
export async function fetchFromIpfs(uri: string): Promise<string> {
  let url: string;

  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    url = uri;
  } else if (uri.startsWith("ipfs://")) {
    const cidAndPath = uri.slice("ipfs://".length);
    url = `${IPFS_GATEWAY}${cidAndPath}`;
  } else {
    // Assume raw CID
    url = `${IPFS_GATEWAY}${uri}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText} for ${url}`);
    }

    return await response.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`IPFS fetch timed out after ${FETCH_TIMEOUT_MS}ms for ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
