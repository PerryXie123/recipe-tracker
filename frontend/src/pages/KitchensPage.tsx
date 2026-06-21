import { useState } from "react";
import { IconCheck, IconCopy, IconDoorExit, IconMail, IconPencil, IconTrash, IconUsers } from "@tabler/icons-react";
import type { Kitchen, KitchenCounts, KitchenInvite, KitchenMember } from "../hooks/useKitchens";
import { Button, ConfirmModal, TextInput } from "../components/ui";

type Props = {
  userId: string;
  kitchens: Kitchen[];
  members: KitchenMember[];
  invites: KitchenInvite[];
  counts: Record<string, KitchenCounts>;
  activeKitchenId?: string;
  message: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onInvite: (id: string, email: string) => Promise<void>;
  onAcceptInvite: (id: string) => Promise<void>;
  onDeclineInvite: (id: string) => Promise<void>;
  onRemoveMember: (kitchenId: string, userId: string) => Promise<void>;
  onDeleteKitchen: (kitchenId: string, confirmationName: string) => Promise<void>;
};

export function KitchensPage(props: Props) {
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string>();
  const [editName, setEditName] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingKitchen, setDeletingKitchen] = useState<Kitchen>();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true); setNotice("");
    try { await action(); } catch (error) { setNotice(getErrorMessage(error)); }
    finally { setBusy(false); }
  }

  function createKitchen() {
    const requestedName = newName.trim();
    const isDuplicate = props.kitchens.some(
      (kitchen) => kitchen.name.trim().toLocaleLowerCase() === requestedName.toLocaleLowerCase()
    );
    if (isDuplicate) {
      setNotice(`You are already part of a kitchen named “${requestedName}”. Choose a different name.`);
      return;
    }
    void run(async () => { await props.onCreate(requestedName); setNewName(""); });
  }

  return <div className="kitchens-page">
    {props.invites.length ? <section className="panel pending-invites-panel">
      <div><h2>Kitchen invitations</h2><p className="muted">You’ve been invited to join {props.invites.length === 1 ? "a kitchen" : `${props.invites.length} kitchens`}.</p></div>
      <div className="pending-invite-list">{props.invites.map((invite) => <div className="pending-invite-row" key={invite.id}>
        <span className="kitchen-icon"><IconMail size={20}/></span>
        <span><strong>{invite.kitchen_name}</strong><small>Invited {new Date(invite.created_at).toLocaleDateString()}</small></span>
        <div><Button size="sm" onClick={() => run(() => props.onAcceptInvite(invite.id))}>Accept</Button><Button size="sm" variant="subtle" onClick={() => run(() => props.onDeclineInvite(invite.id))}>Decline</Button></div>
      </div>)}</div>
    </section> : null}
    <section className="kitchen-actions-grid">
      <div className="panel kitchen-action-card">
        <h2>Create a kitchen</h2><p className="muted">Start a shared space for ingredients and meals.</p>
        <TextInput label="Kitchen name" value={newName} placeholder="Flat kitchen" onChange={setNewName} />
        <Button disabled={!newName.trim()} loading={busy} onClick={createKitchen}>Create kitchen</Button>
      </div>
      <div className="panel kitchen-action-card">
        <h2>Join a kitchen</h2><p className="muted">Enter the code someone shared with you.</p>
        <TextInput label="Invite code" value={joinCode} placeholder="AB12CD34" onChange={setJoinCode} />
        <Button variant="secondary" disabled={!joinCode.trim()} loading={busy} onClick={() => run(async () => { await props.onJoin(joinCode); setJoinCode(""); })}>Join kitchen</Button>
      </div>
    </section>
    {(notice || props.message) ? <p className="form-message">{notice || props.message}</p> : null}
    <div className="kitchen-list">
      {props.kitchens.map((kitchen) => {
        const owner = kitchen.owner_id === props.userId;
        const kitchenMembers = props.members.filter((member) => member.kitchen_id === kitchen.id);
        const kitchenCounts = props.counts[kitchen.id] || { ingredients: 0, meals: 0 };
        return <section className={kitchen.id === props.activeKitchenId ? "panel kitchen-manager-card active" : "panel kitchen-manager-card"} key={kitchen.id}>
          <div className="kitchen-card-heading">
            <div><span className="kitchen-icon"><IconUsers size={20}/></span><div><h2>{kitchen.name}</h2><p className="muted kitchen-stats"><span>{kitchenMembers.length} member{kitchenMembers.length === 1 ? "" : "s"}</span><span>{kitchenCounts.ingredients} ingredient{kitchenCounts.ingredients === 1 ? "" : "s"}</span><span>{kitchenCounts.meals} meal{kitchenCounts.meals === 1 ? "" : "s"}</span></p></div></div>
            {kitchen.id === props.activeKitchenId ? <span className="active-kitchen-badge"><IconCheck size={14}/> Current</span> : <Button size="sm" variant="secondary" onClick={() => props.onSelect(kitchen.id)}>Switch</Button>}
          </div>
          {!kitchen.is_personal ? <>
            <div className="join-code-row"><span><small>SHARE CODE</small><strong>{kitchen.join_code}</strong></span><Button size="sm" variant="subtle" onClick={() => void navigator.clipboard.writeText(kitchen.join_code)}><IconCopy size={16}/> Copy</Button></div>
            {owner ? <div className="kitchen-owner-tools">
              {editing === kitchen.id ? <div className="inline-kitchen-form"><TextInput label="Kitchen name" value={editName} onChange={setEditName}/><Button size="sm" onClick={() => run(async () => { await props.onRename(kitchen.id, editName); setEditing(undefined); })}>Save</Button></div> : <Button size="sm" variant="subtle" onClick={() => { setEditing(kitchen.id); setEditName(kitchen.name); }}><IconPencil size={16}/> Rename</Button>}
              <div className="inline-kitchen-form"><TextInput label="Invite by email" value={inviteEmails[kitchen.id] || ""} placeholder="friend@example.com" onChange={(value) => setInviteEmails({...inviteEmails, [kitchen.id]: value})}/><Button size="sm" variant="secondary" onClick={() => run(async () => { await props.onInvite(kitchen.id, inviteEmails[kitchen.id] || ""); setInviteEmails({...inviteEmails, [kitchen.id]: ""}); setNotice("Invitation sent. It will appear in their Kitchen Manager."); })}><IconMail size={16}/> Send invite</Button></div>
              <div className="kitchen-danger-zone"><div><strong>Delete kitchen</strong><span>Permanently remove this kitchen and everything in it.</span></div><Button size="sm" variant="danger" onClick={() => { setDeletingKitchen(kitchen); setDeleteConfirmation(""); }}><IconTrash size={16}/> Delete kitchen</Button></div>
            </div> : null}
            <div className="member-list">{kitchenMembers.map((member) => <div className="member-row" key={member.user_id}><span className="avatar">{(member.display_name || member.email || "?")[0].toUpperCase()}</span><span><strong>{member.display_name || member.email || "Member"}</strong><small>{member.user_id === kitchen.owner_id ? "Owner" : member.email}</small></span>{member.user_id !== kitchen.owner_id && (owner || member.user_id === props.userId) ? <Button size="sm" variant="danger" onClick={() => run(() => props.onRemoveMember(kitchen.id, member.user_id))}>{owner ? <IconTrash size={15}/> : <IconDoorExit size={15}/>} {owner ? "Remove" : "Leave"}</Button> : null}</div>)}</div>
          </> : null}
        </section>;
      })}
    </div>
    {deletingKitchen ? <ConfirmModal
      title={`Permanently delete ${deletingKitchen.name}?`}
      confirmLabel={busy ? "Deleting..." : "Permanently delete kitchen"}
      disabled={busy || deleteConfirmation !== deletingKitchen.name}
      onCancel={() => { if (!busy) { setDeletingKitchen(undefined); setDeleteConfirmation(""); } }}
      onConfirm={() => run(async () => {
        await props.onDeleteKitchen(deletingKitchen.id, deleteConfirmation);
        setDeletingKitchen(undefined);
        setDeleteConfirmation("");
        setNotice("Kitchen permanently deleted.");
      })}
      body={<div className="super-warning">
        <strong>This cannot be undone.</strong>
        <p>Every ingredient and meal in this kitchen will be permanently deleted. Favourites, calendar entries, memberships, and pending invitations connected to them will also be removed.</p>
        <p>Type <strong>{deletingKitchen.name}</strong> to confirm.</p>
        <TextInput label="Kitchen name" value={deleteConfirmation} onChange={setDeleteConfirmation} />
      </div>}
    /> : null}
  </div>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Something went wrong.";
}
