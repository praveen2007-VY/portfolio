"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitContact } from "@/lib/actions/contact";
import { contactSchema, type ContactInput } from "@/lib/validation/schemas";

export function ContactForm() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({
    kind: "idle",
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "", website: "" },
  });

  const markStart = () => {
    if (startedAt === null) setStartedAt(Date.now());
  };

  const onValid = async (values: ContactInput) => {
    setStatus({ kind: "idle" });
    const result = await submitContact(values, startedAt ?? 0);
    if (result.ok) {
      reset();
      setStartedAt(null);
      setStatus({ kind: "success", message: result.message ?? "Thanks! Your message has been received." });
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (field in values) setError(field as keyof ContactInput, { message });
    }
    setStatus({ kind: "error", message: result.error });
  };

  if (status.kind === "success") {
    return (
      <div role="status" className="flex h-full flex-col items-start justify-center rounded-2xl border border-line bg-paper p-8">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <p className="mt-4 text-lg font-semibold text-ink">Message sent</p>
        <p className="mt-1 text-muted">{status.message}</p>
        <Button variant="secondary" className="mt-6" onClick={() => setStatus({ kind: "idle" })}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onValid)(e)} onFocus={markStart} noValidate className="card space-y-5 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="field-label">
            Name
          </label>
          <input
            id="contact-name"
            autoComplete="name"
            className="field-input"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="contact-name-error" className="field-error">
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="contact-email" className="field-label">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            className="field-input"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="contact-email-error" className="field-error">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="field-label">
          Message
        </label>
        <textarea
          id="contact-message"
          rows={5}
          className="field-input resize-y"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          {...register("message")}
        />
        {errors.message && (
          <p id="contact-message-error" className="field-error">
            {errors.message.message}
          </p>
        )}
      </div>
      {/* Honeypot — hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      {status.kind === "error" && (
        <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {status.message}
        </p>
      )}
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
        {!isSubmitting && <Send className="size-4" aria-hidden />}
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
