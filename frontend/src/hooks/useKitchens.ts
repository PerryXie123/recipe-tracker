import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Kitchen = {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  is_personal: boolean;
  created_at: string;
};

export type KitchenMember = {
  kitchen_id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  kitchen_alias?: string | null;
  joined_at: string;
};

export type KitchenCounts = { ingredients: number; meals: number };

export type KitchenInvite = {
  id: string;
  kitchen_id: string;
  kitchen_name: string;
  invited_by: string;
  created_at: string;
};

export function useKitchens(userId?: string) {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [activeKitchenId, setActiveKitchenIdState] = useState<string>();
  const [members, setMembers] = useState<KitchenMember[]>([]);
  const [invites, setInvites] = useState<KitchenInvite[]>([]);
  const [counts, setCounts] = useState<Record<string, KitchenCounts>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!supabase || !userId) return;
    const client = supabase;
    const ensured = await client.rpc("ensure_personal_kitchen");
    if (ensured.error) throw ensured.error;
    const [kitchenResult, preferenceResult, memberResult, inviteResult, foodResult, recipeResult] = await Promise.all([
      client.from("kitchens").select("id,name,owner_id,join_code,is_personal,created_at").order("is_personal", { ascending: false }).order("name"),
      client.from("user_kitchen_preferences").select("active_kitchen_id").eq("user_id", userId).maybeSingle(),
      client.from("kitchen_members").select("kitchen_id,user_id,email,display_name,kitchen_alias,joined_at").order("joined_at"),
      client.rpc("get_pending_kitchen_invites"),
      client.from("foods").select("kitchen_id"),
      client.from("recipes").select("kitchen_id")
    ]);
    if (kitchenResult.error) throw kitchenResult.error;
    if (preferenceResult.error) throw preferenceResult.error;
    if (memberResult.error) throw memberResult.error;
    if (inviteResult.error) throw inviteResult.error;
    if (foodResult.error) throw foodResult.error;
    if (recipeResult.error) throw recipeResult.error;
    const nextMembers = (memberResult.data || []) as KitchenMember[];
    const nextKitchens = ((kitchenResult.data || []) as Kitchen[]).map((kitchen) => ({
      ...kitchen,
      name: nextMembers.find((member) => member.kitchen_id === kitchen.id && member.user_id === userId)?.kitchen_alias || kitchen.name
    }));
    const preferred = preferenceResult.data?.active_kitchen_id;
    const nextActive = nextKitchens.some((k) => k.id === preferred) ? preferred : nextKitchens[0]?.id;
    setKitchens(nextKitchens);
    setMembers(nextMembers);
    setInvites((inviteResult.data || []) as KitchenInvite[]);
    const nextCounts: Record<string, KitchenCounts> = {};
    nextKitchens.forEach((kitchen) => { nextCounts[kitchen.id] = { ingredients: 0, meals: 0 }; });
    (foodResult.data || []).forEach((food) => {
      if (food.kitchen_id && nextCounts[food.kitchen_id]) nextCounts[food.kitchen_id].ingredients += 1;
    });
    (recipeResult.data || []).forEach((recipe) => {
      if (recipe.kitchen_id && nextCounts[recipe.kitchen_id]) nextCounts[recipe.kitchen_id].meals += 1;
    });
    setCounts(nextCounts);
    setActiveKitchenIdState(nextActive);
    if (nextActive && nextActive !== preferred) {
      await client.from("user_kitchen_preferences").upsert({ user_id: userId, active_kitchen_id: nextActive, updated_at: new Date().toISOString() });
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    refresh().catch((error) => mounted && setMessage(error instanceof Error ? error.message : "Could not load kitchens."))
      .finally(() => mounted && setLoading(false));
    if (!supabase || !userId) return () => { mounted = false; };
    const client = supabase;
    const channel = client.channel(`kitchens-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "kitchens" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "kitchen_members" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "kitchen_invites" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "foods" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes" }, () => void refresh())
      .subscribe();
    return () => { mounted = false; void client.removeChannel(channel); };
  }, [refresh, userId]);

  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get("invite");
    if (!invite || !supabase || !userId) return;
    void supabase.rpc("accept_kitchen_invite", { p_code_or_token: invite }).then(({ error }) => {
      if (error) setMessage(error.message);
      else { setMessage("Kitchen joined."); void refresh(); }
      const url = new URL(window.location.href); url.searchParams.delete("invite");
      window.history.replaceState(null, "", url.pathname + url.search);
    });
  }, [refresh, userId]);

  async function setActiveKitchenId(id: string) {
    if (!supabase || !userId) return;
    setActiveKitchenIdState(id);
    const { error } = await supabase.from("user_kitchen_preferences").upsert({ user_id: userId, active_kitchen_id: id, updated_at: new Date().toISOString() });
    if (error) { setMessage(error.message); await refresh(); }
  }

  async function createKitchen(name: string) {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("create_kitchen", { p_name: name });
    if (error) throw error;
    await refresh();
    if (data) setActiveKitchenIdState(String(data));
  }

  async function joinKitchen(code: string) {
    if (!supabase) return;
    const { error } = await supabase.rpc("accept_kitchen_invite", { p_code_or_token: code });
    if (error) throw error;
    await refresh();
  }

  async function renameKitchen(id: string, name: string) {
    if (!supabase) return;
    const { error } = await supabase.from("kitchens").update({ name: name.trim(), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function inviteByEmail(id: string, email: string) {
    if (!supabase) return;
    const { error } = await supabase.rpc("create_kitchen_invite", { p_kitchen_id: id, p_email: email });
    if (error) throw error;
    await refresh();
  }

  async function acceptInvite(id: string) {
    if (!supabase) return;
    const { error } = await supabase.rpc("accept_kitchen_invitation", { p_invite_id: id });
    if (error) throw error;
    await refresh();
  }

  async function declineInvite(id: string) {
    if (!supabase) return;
    const { error } = await supabase.rpc("decline_kitchen_invitation", { p_invite_id: id });
    if (error) throw error;
    await refresh();
  }

  async function removeMember(kitchenId: string, memberUserId: string) {
    if (!supabase) return;
    const { error } = await supabase.from("kitchen_members").delete().eq("kitchen_id", kitchenId).eq("user_id", memberUserId);
    if (error) throw error;
    await refresh();
  }

  async function deleteKitchen(kitchenId: string, confirmationName: string) {
    if (!supabase) return;
    const { error } = await supabase.rpc("delete_kitchen", {
      p_kitchen_id: kitchenId,
      p_confirmation_name: confirmationName
    });
    if (error) throw error;
    await refresh();
  }

  return { kitchens, activeKitchenId, activeKitchen: kitchens.find((k) => k.id === activeKitchenId), members, invites, counts, loading, message,
    setMessage, setActiveKitchenId, createKitchen, joinKitchen, renameKitchen, inviteByEmail, acceptInvite, declineInvite, removeMember, deleteKitchen };
}
