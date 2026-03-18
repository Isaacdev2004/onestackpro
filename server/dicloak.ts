import crypto from "crypto";

const DICLOAK_API_BASE = "https://app.dicloak.com/gin/v1/api/member";

interface DicloakMemberOptions {
  name: string;
  account: string;
  password: string;
  remark?: string;
  days?: number;
}

interface DicloakEditOptions {
  memberId: string;
  status?: "ENABLED" | "DISABLED";
  password?: string;
  days?: number;
}

function getDicloakToken(): string | null {
  return process.env.DICLOAK_API_TOKEN || null;
}

function getDicloakTeamId(): string | null {
  return process.env.DICLOAK_TEAM_ID || null;
}

export async function createDicloakMember(options: DicloakMemberOptions): Promise<{ success: boolean; memberId?: string; error?: string }> {
  const token = getDicloakToken();
  const teamId = getDicloakTeamId();
  if (!token) {
    console.log("[DICloak] API token not configured, skipping member creation");
    return { success: false, error: "API token not configured" };
  }

  try {
    const params = new URLSearchParams({
      token,
      ...(teamId ? { id: teamId } : {}),
      name: options.name,
      account: options.account,
      password: options.password,
      remark: options.remark || "OneStack subscriber",
      days: String(options.days || 30),
    });

    const url = `${DICLOAK_API_BASE}/open?${params.toString()}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (data.code === 0 || data.success) {
      const memberId = data.data?.id || data.data?.member_id || null;
      console.log(`[DICloak] Member created: ${options.account}, memberId: ${memberId}`);
      return { success: true, memberId };
    } else {
      console.error(`[DICloak] Failed to create member: ${data.msg || JSON.stringify(data)}`);
      return { success: false, error: data.msg || "Unknown error" };
    }
  } catch (err: any) {
    console.error("[DICloak] Create member error:", err.message);
    return { success: false, error: err.message };
  }
}

export async function editDicloakMember(options: DicloakEditOptions): Promise<{ success: boolean; error?: string }> {
  const token = getDicloakToken();
  if (!token) {
    console.log("[DICloak] API token not configured, skipping member edit");
    return { success: false, error: "API token not configured" };
  }

  try {
    const params: Record<string, string> = {
      token,
      member_id: options.memberId,
    };

    if (options.status) params.status = options.status;
    if (options.password) params.password = options.password;
    if (options.days) params.disuse_time = new Date(Date.now() + options.days * 86400000).toISOString().split("T")[0];

    const query = new URLSearchParams(params).toString();
    const url = `${DICLOAK_API_BASE}/edit?${query}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (data.code === 0 || data.success) {
      console.log(`[DICloak] Member ${options.memberId} updated: status=${options.status || "unchanged"}`);
      return { success: true };
    } else {
      console.error(`[DICloak] Failed to edit member: ${data.msg || JSON.stringify(data)}`);
      return { success: false, error: data.msg || "Unknown error" };
    }
  } catch (err: any) {
    console.error("[DICloak] Edit member error:", err.message);
    return { success: false, error: err.message };
  }
}

export async function disableDicloakMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  return editDicloakMember({ memberId, status: "DISABLED" });
}

export async function enableDicloakMember(memberId: string, days?: number): Promise<{ success: boolean; error?: string }> {
  return editDicloakMember({ memberId, status: "ENABLED", days });
}
