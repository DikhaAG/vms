import type { IVmsRepository } from "@/lib/vms/repository";
import { defaultVmsRepository } from "@/lib/vms/repository";

export interface SessionInfo {
  userId?: string;
  userName?: string;
  userRole?: string;
}

export interface CreateContextOptions {
  req?: Request;
  repository?: IVmsRepository;
  session?: SessionInfo;
  enableHikCentralSync?: boolean;
}

export async function createContext(opts?: CreateContextOptions) {
  return {
    repository: opts?.repository ?? defaultVmsRepository,
    session: opts?.session,
    enableHikCentralSync:
      opts?.enableHikCentralSync ?? Boolean(process.env.HIKCENTRAL_APP_KEY),
    req: opts?.req,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
