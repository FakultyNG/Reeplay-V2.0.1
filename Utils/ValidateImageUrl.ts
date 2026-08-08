export const checkImageUrlValidity = async (imageUrl?: string | null) => {
  if (!imageUrl || typeof imageUrl !== 'string' || !/^https?:\/\//i.test(imageUrl)) {
    return false;
  }
  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};
