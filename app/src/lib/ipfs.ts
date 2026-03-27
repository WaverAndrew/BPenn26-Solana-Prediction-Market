const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
const GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

export async function uploadToIpfs(content: string): Promise<string> {
  if (!PINATA_JWT) {
    // Fallback: return a data-uri mock for local dev
    const encoded = Buffer.from(content).toString("base64");
    return `data:text/plain;base64,${encoded}`;
  }

  const blob = new Blob([content], { type: "text/plain" });
  const form = new FormData();
  form.append("file", blob, "content.txt");

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Pinata upload failed: ${res.status}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

export async function fetchFromIpfs(uri: string): Promise<string> {
  // Handle data URIs (local dev fallback)
  if (uri.startsWith("data:")) {
    const base64 = uri.split(",")[1];
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  let url: string;
  if (uri.startsWith("ipfs://")) {
    const hash = uri.replace("ipfs://", "");
    url = `${GATEWAY}/${hash}`;
  } else if (uri.startsWith("http")) {
    url = uri;
  } else {
    url = `${GATEWAY}/${uri}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
  return res.text();
}

export function ipfsToGatewayUrl(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("data:") || uri.startsWith("http")) return uri;
  const hash = uri.replace("ipfs://", "");
  return `${GATEWAY}/${hash}`;
}
