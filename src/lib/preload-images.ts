export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
};

export const preloadImages = async (imagePaths: string[]): Promise<void> => {
  const webpPaths = imagePaths.map(path => path.replace(/\.(png|jpg|jpeg)$/i, '.webp'));
  const allPaths = [...webpPaths, ...imagePaths]; // Load both WebP and fallback
  
  const loadPromises = allPaths.map(path => 
    preloadImage(path).catch(() => {
      // Silently ignore failures - fallback will handle it
      return null;
    })
  );
  
  await Promise.all(loadPromises);
};

// Preload all onboarding images
export const preloadOnboardingImages = () => {
  const onboardingImages = [
    '/onboarding/every-message.png',
    '/onboarding/creating-chapters.png',
    '/onboarding/ai-feeling-emotions.png',
    '/onboarding/identifying-moments.png',
    '/onboarding/preparing-insights.png',
    '/onboarding/discovering-relationships.png',
    '/onboarding/watching-expression.png',
    '/onboarding/discovering-dreams.png',
    '/onboarding/uncovering-patterns.png',
    '/onboarding/recognizing-growth.png',
    '/onboarding/crafting-narrative.png',
    '/onboarding/completing-portrait.png',
    '/onboarding/journey-ready.png',
    '/onboarding/growth-journey-hello.png',
  ];
  
  return preloadImages(onboardingImages);
};