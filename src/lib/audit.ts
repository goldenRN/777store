import { prisma } from "@/lib/prisma";

export type ActorInfo = {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  role?: string | null;
};

export function getActorFromRequest(request: Request): ActorInfo {
  const headers = request.headers;
  return {
    id: headers.get("x-actor-id"),
    name: headers.get("x-actor-name"),
    phone: headers.get("x-actor-phone"),
    role: headers.get("x-actor-role"),
  };
}

export async function logAdminAction(params: {
  request: Request;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  details?: Record<string, unknown> | null;
}) {
  const { request, action, entityType, entityId, details } = params;
  const actor = getActorFromRequest(request);
  try {
    await prisma.adminAuditLog.create({
      data: {
        actor_id: actor.id || null,
        actor_name: actor.name || null,
        actor_phone: actor.phone || null,
        actor_role: actor.role || null,
        action,
        entity_type: entityType,
        entity_id: entityId != null ? String(entityId) : null,
        details: details ?? undefined,
      },
    });
  } catch {
    // ignore audit logging errors to avoid breaking main flow
  }
}
