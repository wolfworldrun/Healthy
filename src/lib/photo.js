// Sends a shrunken copy of a meal photo to the food-photo function.
import { isDemo, supabase, supabaseKey, supabaseUrl } from './supabase.js';

// Off: each scan costs money on the Anthropic API. The code stays so it can be switched back on.
export const PHOTO_SCAN_ENABLED = false;

const MAX_SIDE = 1280;

function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("that photo didn't work, please try another"));
    };
    img.src = url;
  });
}

export async function scanMeal(file) {
  if (isDemo) throw new Error('photo scanning needs a real account');
  const image = await shrink(file);
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${supabaseUrl}/functions/v1/food-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ image })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "couldn't read that photo, please try again");
  return data;
}
