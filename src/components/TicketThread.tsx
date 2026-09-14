import { Headset, User } from "lucide-react";

export type ThreadMessage = {
  id: string;
  body: string;
  isStaff: boolean;
  authorName: string;
  createdAt: string;
};

/**
 * Staff and customer messages are distinguished by colour and side so the
 * conversation reads at a glance in either text direction.
 */
export function TicketThread({
  messages,
  staffLabel,
  youLabel,
}: {
  messages: ThreadMessage[];
  staffLabel: string;
  youLabel: string;
}) {
  return (
    <ol className="flex flex-col gap-4">
      {messages.map((message) => (
        <li
          key={message.id}
          className="card p-5"
          style={
            message.isStaff
              ? { borderColor: "var(--brand)", background: "var(--brand-soft)" }
              : undefined
          }
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-lg"
              style={{
                background: message.isStaff ? "var(--brand)" : "var(--surface-sunken)",
                color: message.isStaff ? "var(--brand-contrast)" : "var(--text-muted)",
              }}
              aria-hidden
            >
              {message.isStaff ? <Headset size={15} /> : <User size={15} />}
            </span>
            <span className="text-sm font-bold">
              {message.isStaff ? staffLabel : youLabel}
              <span className="ms-2 font-normal" style={{ color: "var(--text-faint)" }}>
                {message.authorName}
              </span>
            </span>
            <span className="ms-auto text-xs" style={{ color: "var(--text-faint)" }}>
              {message.createdAt}
            </span>
          </div>
          <p className="mt-3.5 text-sm leading-8 whitespace-pre-wrap">{message.body}</p>
        </li>
      ))}
    </ol>
  );
}
