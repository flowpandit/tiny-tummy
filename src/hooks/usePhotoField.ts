import { useCallback, useEffect, useRef, useState } from "react";

export function usePhotoField() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revokePreview = useCallback((preview: string | null) => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }, []);

  const resetPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview((currentPreview) => {
      revokePreview(currentPreview);
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [revokePreview]);

  const setPhotoFromChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview((currentPreview) => {
      revokePreview(currentPreview);
      return URL.createObjectURL(file);
    });
  }, [revokePreview]);

  useEffect(() => () => {
    revokePreview(photoPreview);
  }, [photoPreview, revokePreview]);

  return {
    fileInputRef,
    photoFile,
    photoPreview,
    resetPhoto,
    setPhotoFromChange,
  };
}
