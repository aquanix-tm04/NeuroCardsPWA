import { supabase } from './supabase';
import { addCardImage, deleteCardImage, getCardImages } from '@/db/repos';
import type { User } from '@supabase/supabase-js';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 0.8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (file.size <= MAX_FILE_SIZE && file.type === 'image/jpeg') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not available')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Compression failed'));
          },
          'image/jpeg',
          QUALITY
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadCardImage(cardId: string, file: File, user: User, displayOrder: number = 0): Promise<string | null> {
  if (!supabase) return null;

  const compressed = await compressImage(file);
  const ext = 'jpg';
  const path = `${user.id}/${cardId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('card-images')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) throw uploadError;

  const { data: imgRecord, error: dbError } = await supabase
    .from('card_images')
    .insert({
      card_id: cardId,
      storage_path: path,
      display_order: displayOrder,
    })
    .select('id')
    .single();

  if (dbError) throw dbError;

  addCardImage(cardId, path, displayOrder);
  return imgRecord?.id ?? null;
}

export function getImageUrl(storagePath: string): string | null {
  if (!supabase) return null;
  const { data } = supabase.storage.from('card-images').getPublicUrl(storagePath);
  return data?.publicUrl ?? null;
}

export async function removeCardImage(imageId: string, storagePath: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from('card-images').remove([storagePath]);
  await supabase.from('card_images').delete().eq('id', imageId);
  deleteCardImage(imageId);
}

export function getLocalCardImages(cardId: string): Array<{ id: string; storage_path: string; display_order: number; url: string | null }> {
  return getCardImages(cardId).map((img) => ({
    ...img,
    url: getImageUrl(img.storage_path),
  }));
}
