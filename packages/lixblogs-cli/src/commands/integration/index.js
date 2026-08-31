import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export async function integrationDisconnect({ client, target }) {
  if (target === "cloudinary") {
    // Shared logic from web/core: the web UI hits DELETE /api/integrations/cloudinary
    const res = await client.http.fetch("/api/integrations/cloudinary", {
      method: "DELETE",
    });
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error("This connection still owns blog media. Delete those assets from the Media tab before removing it.");
      }
      throw new Error("Failed to disconnect Cloudinary");
    }
    return { provider: target };
  } else if (target === "pollinations") {
    // Pollinations stores credentials locally via @pollinations/cli
    const credsPath = path.join(os.homedir(), ".pollinations", "credentials.json");
    if (fs.existsSync(credsPath)) {
      try {
        fs.unlinkSync(credsPath);
      } catch (e) {
        throw new Error("Failed to clear local Pollinations credentials");
      }
    }
    return { provider: target };
  } else {
    throw new Error(`Unknown integration: ${target}`);
  }
}
