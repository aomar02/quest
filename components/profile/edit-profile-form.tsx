"use client";

import { useRef, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { Camera, TriangleAlert } from "lucide-react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  updateProfile,
  deleteAccount,
  type UpdateProfileState,
  type DeleteAccountState,
} from "@/lib/profile/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
    </Button>
  );
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "جارٍ الحذف..." : "نعم، احذف حسابي"}
    </Button>
  );
}

export function EditProfileForm({
  avatarUrl,
  fallbackInitial,
  currentDisplayName,
  currentBio,
  username,
}: {
  avatarUrl: string;
  fallbackInitial: string;
  currentDisplayName: string;
  currentBio: string;
  username: string;
}) {
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [profileState, profileAction] = useActionState<UpdateProfileState, FormData>(
    updateProfile,
    {},
  );
  const [deleteState, deleteAction] = useActionState<DeleteAccountState, FormData>(
    deleteAccount,
    {},
  );

  // useUser() gives the live image URL so the preview updates instantly after upload.
  const liveAvatarUrl = user?.imageUrl ?? avatarUrl;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setAvatarError(null);
  }

  async function handleAvatarSave() {
    const file = inputRef.current?.files?.[0];
    if (!file || !user) return;
    setIsUploadingAvatar(true);
    setAvatarError(null);
    try {
      await user.setProfileImage({ file });
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setAvatarError("تعذر رفع الصورة، حاول مرة أخرى");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">الصورة الشخصية</h2>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative shrink-0"
          >
            <Avatar className="size-20">
              <AvatarImage src={preview ?? liveAvatarUrl} alt="الصورة الشخصية" />
              <AvatarFallback className="text-2xl">{fallbackInitial}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-5 text-white" />
            </span>
          </button>

          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              اختر صورة
            </Button>
            {preview && (
              <Button
                type="button"
                size="sm"
                disabled={isUploadingAvatar}
                onClick={handleAvatarSave}
              >
                {isUploadingAvatar ? "جارٍ الرفع..." : "رفع الصورة"}
              </Button>
            )}
          </div>
        </div>
        {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}
      </section>

      {/* Profile fields */}
      <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">معلومات الملف الشخصي</h2>
        <form action={profileAction} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              اسم المستخدم
            </label>
            <input
              id="username"
              type="text"
              value={username}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-secondary opacity-60 outline-none"
            />
            <p className="text-xs text-text-muted">لا يمكن تغيير اسم المستخدم</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-sm font-medium">
              الاسم المعروض
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              maxLength={50}
              required
              defaultValue={currentDisplayName}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            {profileState.fieldErrors?.displayName && (
              <p className="text-sm text-destructive">
                {profileState.fieldErrors.displayName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-sm font-medium">
              النبذة الشخصية{" "}
              <span className="text-text-secondary">(اختياري)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              maxLength={160}
              defaultValue={currentBio}
              placeholder="اكتب نبذة مختصرة عنك..."
              className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            {profileState.fieldErrors?.bio && (
              <p className="text-sm text-destructive">{profileState.fieldErrors.bio}</p>
            )}
          </div>

          {profileState.error && (
            <p className="text-sm text-destructive">{profileState.error}</p>
          )}

          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </section>

      {/* Danger zone */}
      <section className="space-y-4 rounded-2xl border border-destructive/40 bg-card p-6">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-destructive" />
          <h2 className="text-base font-semibold text-destructive">منطقة الخطر</h2>
        </div>
        <p className="text-sm text-text-secondary">
          حذف حسابك نهائي ولا يمكن التراجع عنه. ستُحذف جميع بياناتك — تقييماتك ومجموعاتك
          ومكتبة ألعابك — بشكل دائم.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
        >
          حذف الحساب
        </Button>
      </section>

      {/* Delete confirmation dialog */}
      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/60 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <AlertDialog.Title className="text-lg font-bold text-text-primary">
              هل أنت متأكد تماماً؟
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-text-secondary">
              سيتم حذف حسابك وجميع بياناتك بشكل نهائي ودائم. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialog.Description>

            <form action={deleteAction} className="mt-6 space-y-4">
              {deleteState.error && (
                <p className="text-sm text-destructive">{deleteState.error}</p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                >
                  إلغاء
                </Button>
                <DeleteSubmitButton />
              </div>
            </form>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
