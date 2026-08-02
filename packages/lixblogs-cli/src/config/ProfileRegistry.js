/**
 * ProfileRegistry — tracks which profile IDs the user has ever logged into,
 * so the CLI can support `lixblogs auth status` (no profile given, meaning
 * "show me all of them") and profile-switching commands.
 *
 * This deliberately stores NOTHING sensitive — just profile names/IDs, not
 * tokens. It's fine for this to live in a plain config file on disk (not
 * the keychain), since profile *names* aren't a secret; only the
 * credentials tied to them are, and those live in CredentialStore.
 *
 * Rationale for why this exists at all: OS keychains generally don't
 * support "list all entries for this service" without extra permissions
 * (see KeychainCredentialStore.listProfiles, which explicitly throws and
 * points here instead). This registry is what makes listing/switching
 * profiles possible without asking the OS keychain to do something most
 * platforms don't reliably support.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

function defaultRegistryPath() {
  return path.join(os.homedir(), ".config", "lixblogs", "profiles.json");
}

export class ProfileRegistry {
  /** @param {string} [registryPath] */
  constructor(registryPath = defaultRegistryPath()) {
    this._path = registryPath;
  }

  /** @returns {Promise<string[]>} */
  async list() {
    try {
      const raw = await fs.readFile(this._path, "utf8");
      const data = JSON.parse(raw);
      return Array.isArray(data.profiles) ? data.profiles : [];
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
  }

  /** @param {string} profileId */
  async add(profileId) {
    const profiles = new Set(await this.list());
    profiles.add(profileId);
    await this._write([...profiles]);
  }

  /** @param {string} profileId */
  async remove(profileId) {
    const profiles = (await this.list()).filter((id) => id !== profileId);
    await this._write(profiles);
  }

  async _write(profiles) {
    await fs.mkdir(path.dirname(this._path), { recursive: true });
    await fs.writeFile(this._path, JSON.stringify({ profiles }, null, 2), "utf8");
  }
}
