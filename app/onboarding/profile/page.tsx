"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { completeProfile, type CompleteProfileState } from "../actions";
import { Button } from "@/components/ui/button";

const initialState: CompleteProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : "متابعة"}
    </Button>
  );
}

export default function ProfileOnboardingPage() {
  const [state, formAction] = useActionState(completeProfile, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold">عرّف بنفسك</h1>
          <p className="mt-1 text-sm text-text-secondary">
            أضف اسماً معروضاً ونبذة قصيرة لتظهر في ملفك الشخصي
          </p>
        </div>

        <div className="space-y-2 text-start">
          <label htmlFor="displayName" className="text-sm font-medium">
            الاسم المعروض
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            maxLength={50}
            required
            placeholder="مثال: أحمد العلي"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {state.fieldErrors?.displayName && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.displayName}
            </p>
          )}
        </div>

        <div className="space-y-2 text-start">
          <label htmlFor="bio" className="text-sm font-medium">
            نبذة قصيرة{" "}
            <span className="text-text-secondary">(اختياري)</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={160}
            placeholder="اكتب نبذة مختصرة عنك..."
            className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {state.fieldErrors?.bio && (
            <p className="text-sm text-destructive">{state.fieldErrors.bio}</p>
          )}
        </div>

        {state.error && (
          <p className="text-center text-sm text-destructive">{state.error}</p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
