"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function AvatarOnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleContinue() {
    if (!file || !user) return;
    setIsUploading(true);
    await user.setProfileImage({ file });
    router.push("/onboarding/profile");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 text-center">
        <div>
          <h1 className="text-xl font-bold">أضف صورة شخصية</h1>
          <p className="mt-1 text-sm text-text-secondary">
            ستظهر هذه الصورة في ملفك الشخصي وفي أنحاء كويست
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative mx-auto block"
        >
          <Avatar className="mx-auto size-24">
            <AvatarImage
              src={preview ?? undefined}
              alt="معاينة الصورة الشخصية"
            />
            <AvatarFallback className="text-2xl">
              {user?.firstName?.[0] ?? "ك"}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5 text-white" />
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          className="w-full"
          disabled={!file || isUploading}
          onClick={handleContinue}
        >
          {isUploading ? "جارٍ الرفع..." : "متابعة"}
        </Button>
      </div>
    </div>
  );
}
