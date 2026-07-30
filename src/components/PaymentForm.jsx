import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { uploadFile } from "../api/client";
import { money, PAYMENT_METHODS, toast } from "../utils/format";
import { closeSheet } from "./Sheet.jsx";

export default function PaymentForm({ orderId, balance, onDone }) {
  const qc = useQueryClient();
  const [amt, setAmt] = useState(balance > 0 ? balance : "");
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [receiptImg, setReceiptImg] = useState(null);
  const [uploading, setUploading] = useState(false);

  const mut = useMutation({
    mutationFn: () => ordersApi.addPayment(orderId, { amt: Number(amt), method, receiptImg }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast("Payment recorded");
      onDone ? onDone() : closeSheet();
    },
    onError: (e) => toast(e.message),
  });

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setReceiptImg(url);
    } catch (err) {
      toast("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="filter-note" style={{ marginBottom: 14 }}>Balance due: <b>{money(balance)}</b></div>
      <div className="field">
        <label>Amount received</label>
        <input type="number" inputMode="numeric" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0" />
      </div>
      <div className="field">
        <label>Payment method</label>
        <div className="pay-opts">
          {PAYMENT_METHODS.map((m) => (
            <label className="pay-opt" key={m}>
              <input type="radio" name="paymethod" checked={method === m} onChange={() => setMethod(m)} />
              <span>{m}</span>
            </label>
          ))}
        </div>
      </div>
      {method !== "Cash" && (
        <div className="field">
          <label>Payment receipt <span className="hint">(optional — camera or gallery)</span></label>
          {receiptImg ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={receiptImg} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover" }} />
              <button className="btn ghost sm" onClick={() => setReceiptImg(null)}>Remove</button>
            </div>
          ) : (
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
          )}
        </div>
      )}
      <button className="btn teal" disabled={mut.isPending || !amt} onClick={() => mut.mutate()}>
        {mut.isPending ? "Saving…" : "Save payment"}
      </button>
    </div>
  );
}
