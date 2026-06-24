import { useState } from "react";
import { ConfirmModal, SelectInput } from "./ui";

export function CopyToKitchenModal({
  itemCount,
  itemLabel,
  kitchens,
  copiesDependencies = false,
  onCopy,
  onCancel
}: {
  itemCount: number;
  itemLabel: string;
  kitchens: Array<{ id: string; name: string }>;
  copiesDependencies?: boolean;
  onCopy: (kitchenId: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [targetKitchenId, setTargetKitchenId] = useState(kitchens[0]?.id || "");
  const [isCopying, setIsCopying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function confirm() {
    if (!targetKitchenId) return;
    setIsCopying(true);
    setErrorMessage("");
    try {
      await onCopy(targetKitchenId);
      onCancel();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <ConfirmModal
      title={`Copy ${itemCount} ${itemLabel}${itemCount === 1 ? "" : "s"}?`}
      confirmLabel={isCopying ? "Copying..." : "Copy to kitchen"}
      tone="primary"
      disabled={isCopying || !targetKitchenId}
      onConfirm={() => void confirm()}
      onCancel={onCancel}
      body={<div className="copy-kitchen-modal-body">
        <p>Select the destination kitchen. Name conflicts receive the next available suffix, such as (2) or (3).</p>
        {copiesDependencies ? <p>Every ingredient used by the selected meals will also be copied.</p> : null}
        <SelectInput
          label="Destination kitchen"
          value={targetKitchenId}
          options={kitchens.map((kitchen) => ({ value: kitchen.id, label: kitchen.name }))}
          onChange={(value) => setTargetKitchenId(value || "")}
        />
        {errorMessage ? <p className="form-message">{errorMessage}</p> : null}
      </div>}
    />
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Could not copy the selected items.";
}
