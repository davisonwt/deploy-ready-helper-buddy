// In-app chat notices to a DJ about their Grove Station slot, sent from
// the Grove Station system account (profiles.is_system, username
// "grovestation") in a direct room with the DJ -- the same
// get_or_create_direct_room + chat_messages insert the GoSat roundup uses.
// Best-effort: a failed notice is logged and reported, never allowed to
// undo the slot change that triggered it.

export const GROVE_STATION_USER_ID =
  Deno.env.get("GROVE_STATION_USER_ID") ?? "e9758e23-fba4-4778-8e58-4fd8e5550a72";

export type RadioNoticeType = "scheduled" | "reminder" | "cancelled";

export function formatSlotTime(startsAtIso: string): string {
  const d = new Date(startsAtIso);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const time = d.toISOString().slice(11, 16);
  return `${day}, ${time} UTC`;
}

export function slotLabel(slot: { title: string | null; starts_at: string }): string {
  const when = formatSlotTime(slot.starts_at);
  return slot.title ? `"${slot.title}" (${when})` : `your slot on ${when}`;
}

// deno-lint-ignore no-explicit-any
export async function postRadioNotice(
  service: any,
  djUserId: string,
  slotId: string,
  type: RadioNoticeType,
  content: string,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  try {
    const { data: roomId, error: roomError } = await service.rpc("get_or_create_direct_room", {
      user1_id: GROVE_STATION_USER_ID,
      user2_id: djUserId,
    });
    if (roomError || !roomId) return { ok: false, error: roomError?.message ?? "no room" };

    const { data: msg, error: msgError } = await service
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: GROVE_STATION_USER_ID,
        content,
        message_type: "text",
        system_metadata: { source: "radio_slot", type, slot_id: slotId, sender_name: "Grove Station" },
      })
      .select("id")
      .single();
    if (msgError || !msg) return { ok: false, error: msgError?.message ?? "no message" };
    return { ok: true, messageId: msg.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
