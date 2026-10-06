import { listDevices, ringMode } from "../../../../lib/ring/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = ringMode();
  try {
    const devices = await listDevices();
    return Response.json({ mode, devices: devices.map((d) => ({ id: d.id, name: d.name })), ok: true });
  } catch (e) {
    console.error("ring status failed", e);
    const s = (e as { status?: number }).status;
    const error = s === 401 ? "token expired - get a fresh Playground token" : s === 404 ? "no fixture for this call" : "upstream error";
    return Response.json({ mode, devices: [], ok: false, error });
  }
}
